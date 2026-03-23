/**
 * followUpScheduler.ts
 *
 * Handles the full follow-up call lifecycle:
 * 1. extractFollowUpIntent() — LLM reads transcript, extracts "call me back in X" requests
 * 2. scheduleFollowUpCall()  — saves to scheduled_calls table
 * 3. makeOutboundCall()      — Twilio initiates the call at the scheduled time
 * 4. startCronJob()          — polls every minute for due calls
 *
 * When Alex calls back, he opens with full context from the previous conversation.
 */

import twilio from "twilio";
import { getDb } from "../db";
import { scheduledCalls, callerProfiles } from "../../drizzle/schema";
import { eq, lte, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { baylioSalesAgentPrompt } from "./prompts/baylioSalesAgent";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const SALES_LINE = process.env.BAYLIO_SALES_PHONE || "+18448752441";
const BASE_URL = "https://baylio.io";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FollowUpIntent {
  hasFollowUp: boolean;
  scheduledAt: string | null;   // ISO 8601 datetime string, or null
  reason: string | null;        // What the caller said, e.g. "call me after 4pm today"
  context: string | null;       // Summary of what was discussed for Alex to reference
}

// ─── Extract Follow-Up Intent from Transcript ─────────────────────────────────

export async function extractFollowUpIntent(
  transcript: string,
  callerPhone: string
): Promise<FollowUpIntent> {
  const now = new Date().toISOString();

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a call analysis assistant. Extract follow-up scheduling intent from call transcripts.
Current UTC time: ${now}
Caller phone: ${callerPhone}

Return a JSON object with this exact schema:
{
  "hasFollowUp": boolean,
  "scheduledAt": "ISO 8601 datetime string or null",
  "reason": "exact phrase the caller used or null",
  "context": "2-3 sentence summary of what was discussed for the callback or null"
}

Rules:
- hasFollowUp is true ONLY if the caller explicitly asked to be called back at a specific time
- Examples: "call me after 4", "call me tomorrow", "let's talk next week", "I'm busy now, call me in 2 hours"
- If they said "I'll think about it" or "maybe later" without a time, hasFollowUp is false
- scheduledAt must be a valid future UTC timestamp
- If they said "after 4pm" and it's currently 2pm UTC, schedule for today at 4pm UTC
- If they said "tomorrow morning", schedule for tomorrow at 9am UTC
- If they said "next week", schedule for 7 days from now at 10am UTC`,
        },
        {
          role: "user",
          content: `Analyze this call transcript and extract any follow-up scheduling request:\n\n${transcript}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "follow_up_intent",
          strict: true,
          schema: {
            type: "object",
            properties: {
              hasFollowUp: { type: "boolean" },
              scheduledAt: { type: ["string", "null"] },
              reason: { type: ["string", "null"] },
              context: { type: ["string", "null"] },
            },
            required: ["hasFollowUp", "scheduledAt", "reason", "context"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) return { hasFollowUp: false, scheduledAt: null, reason: null, context: null };

    return JSON.parse(String(content)) as FollowUpIntent;
  } catch (err) {
    console.error("[FollowUp] Failed to extract intent:", err);
    return { hasFollowUp: false, scheduledAt: null, reason: null, context: null };
  }
}

// ─── Save Follow-Up to Database ───────────────────────────────────────────────

export async function scheduleFollowUpCall(
  phone: string,
  intent: FollowUpIntent,
  callerProfileId?: number,
  prospectId?: number
): Promise<void> {
  if (!intent.hasFollowUp || !intent.scheduledAt) return;

  const db = await getDb();
  if (!db) return;

  const scheduledAt = new Date(intent.scheduledAt);
  if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    console.warn("[FollowUp] Invalid or past scheduledAt, skipping:", intent.scheduledAt);
    return;
  }

  await db.insert(scheduledCalls).values({
    phone,
    callerProfileId: callerProfileId ?? null,
    prospectId: prospectId ?? null,
    scheduledAt,
    reason: intent.reason ?? null,
    context: intent.context ?? null,
    status: "pending",
    attempts: 0,
  });

  console.log(`[FollowUp] Scheduled callback to ${phone} at ${scheduledAt.toISOString()}`);
}

// ─── Make Outbound Call ───────────────────────────────────────────────────────

async function makeOutboundCall(scheduledCall: typeof scheduledCalls.$inferSelect): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Mark as calling to prevent duplicate attempts
  await db
    .update(scheduledCalls)
    .set({ status: "calling", lastAttemptAt: new Date(), attempts: scheduledCall.attempts + 1 })
    .where(eq(scheduledCalls.id, scheduledCall.id));

  try {
    // Build Alex's opening context for the callback
    let callerName = "there";
    let contextBlock = "";

    if (scheduledCall.callerProfileId) {
      const [profile] = await db
        .select()
        .from(callerProfiles)
        .where(eq(callerProfiles.id, scheduledCall.callerProfileId))
        .limit(1);
      if (profile?.name) callerName = profile.name;
    }

    if (scheduledCall.context) {
      contextBlock = `\n\n[CALLBACK CONTEXT]\nThis is a scheduled callback. The caller asked to be called back: "${scheduledCall.reason || "at this time"}"\nPrevious conversation summary: ${scheduledCall.context}\nOpen with: "Hey ${callerName}, it's Alex from Baylio — you asked me to call you back. Last time we were talking about [reference context]. Ready to continue?"`;
    } else {
      contextBlock = `\n\n[CALLBACK CONTEXT]\nThis is a scheduled callback. The caller asked to be called back: "${scheduledCall.reason || "at this time"}"\nOpen with: "Hey ${callerName}, it's Alex from Baylio — you asked me to give you a call back. Is now still a good time?"`;
    }

    const callbackSystemPrompt = baylioSalesAgentPrompt + contextBlock;

    // Initiate outbound call via Twilio
    const call = await twilioClient.calls.create({
      to: scheduledCall.phone,
      from: SALES_LINE,
      url: `${BASE_URL}/api/twilio/outbound-voice?scheduledCallId=${scheduledCall.id}&systemPrompt=${encodeURIComponent(callbackSystemPrompt.slice(0, 2000))}`,
      statusCallback: `${BASE_URL}/api/twilio/status`,
      statusCallbackMethod: "POST",
    });

    await db
      .update(scheduledCalls)
      .set({ status: "completed", callSid: call.sid })
      .where(eq(scheduledCalls.id, scheduledCall.id));

    console.log(`[FollowUp] Outbound call initiated to ${scheduledCall.phone}, SID: ${call.sid}`);
  } catch (err) {
    console.error(`[FollowUp] Failed to call ${scheduledCall.phone}:`, err);

    // After 3 failed attempts, mark as failed
    const newAttempts = scheduledCall.attempts + 1;
    await db
      .update(scheduledCalls)
      .set({
        status: newAttempts >= 3 ? "failed" : "pending",
        lastAttemptAt: new Date(),
        attempts: newAttempts,
        // Retry in 30 minutes if not yet at max attempts
        scheduledAt: newAttempts < 3 ? new Date(Date.now() + 30 * 60 * 1000) : scheduledCall.scheduledAt,
      })
      .where(eq(scheduledCalls.id, scheduledCall.id));
  }
}

// ─── Cron Job — Poll Every Minute ─────────────────────────────────────────────

let cronRunning = false;

export function startFollowUpCron(): void {
  if (cronRunning) return;
  cronRunning = true;

  console.log("[FollowUp] Cron job started — checking for due callbacks every 60 seconds");

  setInterval(async () => {
    try {
      const db = await getDb();
      if (!db) return;

      const now = new Date();
      const dueCalls = await db
        .select()
        .from(scheduledCalls)
        .where(
          and(
            eq(scheduledCalls.status, "pending"),
            lte(scheduledCalls.scheduledAt, now)
          )
        )
        .limit(10); // Process max 10 at a time

      if (dueCalls.length > 0) {
        console.log(`[FollowUp] Found ${dueCalls.length} due callback(s)`);
        for (const call of dueCalls) {
          await makeOutboundCall(call);
        }
      }
    } catch (err) {
      console.error("[FollowUp] Cron error:", err);
    }
  }, 60_000); // Every 60 seconds
}
