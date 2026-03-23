/**
 * Caller Memory Service
 * 
 * Gives the Baylio Sales AI persistent memory across calls.
 * 
 * Flow:
 * 1. Call arrives → lookupCallerProfile(phone) → inject into system prompt
 * 2. Call ends → extractMemoryFromTranscript(transcript) → upsertCallerProfile + saveMemoryFacts
 * 
 * The AI can then greet returning callers by name, remember their shop,
 * skip the sales pitch for founders/testers, and reference past objections.
 */

import { getDb } from "../db";
import { callerProfiles, callerMemoryFacts } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export type CallerRole = "prospect" | "shop_owner" | "founder" | "tester" | "vendor" | "unknown";

export interface CallerContext {
  isKnown: boolean;
  name?: string;
  role: CallerRole;
  shopName?: string;
  shopCity?: string;
  shopState?: string;
  callCount: number;
  notes?: string;
  doNotSell: boolean;
  recentFacts: Array<{ factType: string; factValue: string }>;
}

/**
 * Look up a caller by phone number and return their full context.
 * Called at the START of every sales line call to personalize the AI.
 */
export async function lookupCallerProfile(phone: string): Promise<CallerContext> {
  const db = await getDb();
  if (!db) return { isKnown: false, role: "unknown" as CallerRole, callCount: 0, doNotSell: false, recentFacts: [] };
  const normalized = normalizePhone(phone);

  try {
    const [profile] = await db
      .select()
      .from(callerProfiles)
      .where(eq(callerProfiles.phone, normalized))
      .limit(1);

    if (!profile) {
      return {
        isKnown: false,
        role: "unknown",
        callCount: 0,
        doNotSell: false,
        recentFacts: [],
      };
    }

    // Fetch the 10 most recent memory facts for this caller
    const facts = await db
      .select()
      .from(callerMemoryFacts)
      .where(eq(callerMemoryFacts.callerProfileId, profile.id))
      .orderBy(desc(callerMemoryFacts.extractedAt))
      .limit(10);

    return {
      isKnown: true,
      name: profile.name ?? undefined,
      role: profile.role as CallerRole,
      shopName: profile.shopName ?? undefined,
      shopCity: profile.shopCity ?? undefined,
      shopState: profile.shopState ?? undefined,
      callCount: profile.callCount,
      notes: profile.notes ?? undefined,
      doNotSell: profile.doNotSell,
      recentFacts: facts.map(f => ({ factType: f.factType, factValue: f.factValue })),
    };
  } catch (err) {
    console.error("[CallerMemory] Error looking up caller:", err);
    return { isKnown: false, role: "unknown", callCount: 0, doNotSell: false, recentFacts: [] };
  }
}

/**
 * Build a memory context block to inject into the sales AI system prompt.
 * This is what makes the AI "remember" the caller.
 */
export function buildMemoryPromptBlock(ctx: CallerContext): string {
  if (!ctx.isKnown) {
    return `CALLER MEMORY: This is a new caller. No prior information available. Learn their name and shop details naturally during the conversation.`;
  }

  const lines: string[] = [
    `CALLER MEMORY (IMPORTANT — use this to personalize the conversation):`,
    `- This caller has called ${ctx.callCount} time${ctx.callCount !== 1 ? "s" : ""} before.`,
  ];

  if (ctx.name) lines.push(`- Their name is ${ctx.name}. Address them by name naturally.`);
  if (ctx.role === "founder") {
    lines.push(`- ROLE: This is Abdur, the FOUNDER of Baylio. He is testing the system. Do NOT give him a sales pitch. Instead, be transparent, helpful, and discuss how the product is working. Ask him for feedback.`);
  } else if (ctx.role === "tester") {
    lines.push(`- ROLE: This is an internal tester. Skip the standard sales pitch. Be conversational and ask what they're testing.`);
  } else if (ctx.role === "shop_owner") {
    lines.push(`- ROLE: Existing shop owner / customer.`);
  }
  if (ctx.shopName) lines.push(`- Their shop is called "${ctx.shopName}"${ctx.shopCity ? ` in ${ctx.shopCity}${ctx.shopState ? `, ${ctx.shopState}` : ""}` : ""}.`);
  if (ctx.notes) lines.push(`- Notes from previous calls: ${ctx.notes}`);
  if (ctx.doNotSell) lines.push(`- DO NOT attempt to sell. This person has requested no sales contact.`);

  if (ctx.recentFacts.length > 0) {
    lines.push(`- Key facts from past conversations:`);
    ctx.recentFacts.forEach(f => {
      lines.push(`  • [${f.factType}] ${f.factValue}`);
    });
  }

  return lines.join("\n");
}

/**
 * After a call ends, extract structured memory from the transcript using LLM.
 * Saves/updates the caller profile and stores individual memory facts.
 */
export async function extractAndSaveMemory(
  phone: string,
  transcript: string,
  callSid: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const normalized = normalizePhone(phone);

  try {
    // Use LLM to extract structured facts from the transcript
    const extractionResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a CRM data extraction assistant. Extract key information from this sales call transcript and return ONLY valid JSON. No markdown, no explanation.`,
        },
        {
          role: "user",
          content: `Extract caller information from this transcript and return JSON with this exact structure:
{
  "name": "string or null",
  "role": "prospect|shop_owner|founder|tester|vendor|unknown",
  "shopName": "string or null",
  "shopCity": "string or null", 
  "shopState": "string or null",
  "notes": "1-2 sentence summary of the call",
  "facts": [
    {"factType": "string", "factValue": "string"}
  ]
}

Fact types to look for: "objection", "interest", "budget", "follow_up", "pain_point", "competitor_mentioned", "timeline", "decision_maker", "language_preference"

Special roles: If the caller mentions they are the founder, owner of Baylio, or "Abdur", set role to "founder". If they say they are testing, set role to "tester".

Transcript:
${transcript.slice(0, 4000)}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "caller_memory_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              name: { type: ["string", "null"] },
              role: { type: "string", enum: ["prospect", "shop_owner", "founder", "tester", "vendor", "unknown"] },
              shopName: { type: ["string", "null"] },
              shopCity: { type: ["string", "null"] },
              shopState: { type: ["string", "null"] },
              notes: { type: ["string", "null"] },
              facts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    factType: { type: "string" },
                    factValue: { type: "string" },
                  },
                  required: ["factType", "factValue"],
                  additionalProperties: false,
                },
              },
            },
            required: ["name", "role", "shopName", "shopCity", "shopState", "notes", "facts"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = extractionResponse?.choices?.[0]?.message?.content;
    if (!rawContent) return;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    const extracted = JSON.parse(content);

    // Upsert caller profile
    const [existing] = await db
      .select()
      .from(callerProfiles)
      .where(eq(callerProfiles.phone, normalized))
      .limit(1);

    if (existing) {
      await db
        .update(callerProfiles)
        .set({
          name: extracted.name ?? existing.name,
          role: extracted.role ?? existing.role,
          shopName: extracted.shopName ?? existing.shopName,
          shopCity: extracted.shopCity ?? existing.shopCity,
          shopState: extracted.shopState ?? existing.shopState,
          notes: extracted.notes ?? existing.notes,
          callCount: existing.callCount + 1,
          lastCalledAt: new Date(),
        })
        .where(eq(callerProfiles.phone, normalized));

      // Save new memory facts
      if (extracted.facts?.length > 0) {
        await db.insert(callerMemoryFacts).values(
          extracted.facts.map((f: { factType: string; factValue: string }) => ({
            callerProfileId: existing.id,
            factType: f.factType,
            factValue: f.factValue,
            callSid,
          }))
        );
      }
    } else {
      // Create new profile
      const [inserted] = await db
        .insert(callerProfiles)
        .values({
          phone: normalized,
          name: extracted.name,
          role: extracted.role ?? "unknown",
          shopName: extracted.shopName,
          shopCity: extracted.shopCity,
          shopState: extracted.shopState,
          notes: extracted.notes,
          callCount: 1,
          lastCalledAt: new Date(),
        })
        .$returningId();

      if (inserted && extracted.facts?.length > 0) {
        await db.insert(callerMemoryFacts).values(
          extracted.facts.map((f: { factType: string; factValue: string }) => ({
            callerProfileId: inserted.id,
            factType: f.factType,
            factValue: f.factValue,
            callSid,
          }))
        );
      }
    }

    console.log(`[CallerMemory] Saved memory for ${normalized}: ${extracted.name ?? "unknown"} (${extracted.role})`);
  } catch (err) {
    console.error("[CallerMemory] Error extracting/saving memory:", err);
    // Non-fatal — don't break the post-call pipeline
  }
}

/**
 * Manually upsert a caller profile (e.g., from admin dashboard or founder setup).
 */
export async function upsertCallerProfile(
  phone: string,
  data: {
    name?: string;
    role?: CallerRole;
    shopName?: string;
    shopCity?: string;
    shopState?: string;
    notes?: string;
    doNotSell?: boolean;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const normalized = normalizePhone(phone);

  const [existing] = await db
    .select()
    .from(callerProfiles)
    .where(eq(callerProfiles.phone, normalized))
    .limit(1);

  if (existing) {
    await db
      .update(callerProfiles)
      .set({
        name: data.name ?? existing.name,
        role: data.role ?? existing.role,
        shopName: data.shopName ?? existing.shopName,
        shopCity: data.shopCity ?? existing.shopCity,
        shopState: data.shopState ?? existing.shopState,
        notes: data.notes ?? existing.notes,
        doNotSell: data.doNotSell ?? existing.doNotSell,
      })
      .where(eq(callerProfiles.phone, normalized));
  } else {
    await db.insert(callerProfiles).values({
      phone: normalized,
      name: data.name,
      role: data.role ?? "unknown",
      shopName: data.shopName,
      shopCity: data.shopCity,
      shopState: data.shopState,
      notes: data.notes,
      doNotSell: data.doNotSell ?? false,
    });
  }
}

/**
 * Get all caller profiles for admin dashboard.
 */
export async function getAllCallerProfiles() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(callerProfiles)
    .orderBy(desc(callerProfiles.lastCalledAt))
    .limit(200);
}

/**
 * Get memory facts for a specific caller profile.
 */
export async function getCallerFacts(callerProfileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(callerMemoryFacts)
    .where(eq(callerMemoryFacts.callerProfileId, callerProfileId))
    .orderBy(desc(callerMemoryFacts.extractedAt))
    .limit(50);
}

/** Normalize phone to E.164 format for consistent keying */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}
