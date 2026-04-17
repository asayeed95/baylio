/**
 * Sam Tools Service
 *
 * Backend implementations of the tools Sam (Baylio's sales agent) calls during
 * a live conversation. Each tool maps to one or more business actions:
 *   - capture_lead         → DB insert + HubSpot upsert (Baylio's own account)
 *   - send_sms_followup    → Twilio SMS with consent flag
 *   - send_email_followup  → Resend email with consent flag
 *   - start_onboarding_assist → flag for human follow-up + lead upsert
 *
 * transfer_to_human is handled at the Express level (returns TwiML) — not here.
 */
import { Client } from "@hubspot/api-client";
import { Resend } from "resend";
import { getDb } from "../db";
import { eq, sql } from "drizzle-orm";
import { samLeads, type InsertSamLead } from "../../drizzle/schema";
import { sendSMS } from "./smsService";

const HUBSPOT_KEY = process.env.HUBSPOT_API_KEY || "";
const RESEND_KEY = process.env.RESEND_API_KEY || "";

type LeadIntent = NonNullable<InsertSamLead["intent"]>;

interface CaptureLeadInput {
  callerPhone: string;
  name?: string;
  email?: string;
  shopName?: string;
  city?: string;
  intent?: LeadIntent;
  intentSummary?: string;
  language?: string;
  marketingConsent?: boolean;
  conversationId?: string;
}

interface CaptureLeadResult {
  leadId: number;
  hubspotContactId: string | null;
  isReturningCaller: boolean;
}

/**
 * Upsert a lead into Baylio's DB and push to HubSpot (best-effort).
 * Idempotent on callerPhone — repeat calls update the existing row + bump callCount.
 */
export async function captureLead(
  input: CaptureLeadInput
): Promise<CaptureLeadResult | null> {
  const db = await getDb();
  if (!db) return null;

  const phone = input.callerPhone.replace(/[^\d+]/g, "");
  if (!phone) return null;

  // Upsert
  const existing = await db
    .select()
    .from(samLeads)
    .where(eq(samLeads.callerPhone, phone))
    .limit(1);

  let leadId: number;
  const isReturningCaller = existing.length > 0;

  if (isReturningCaller) {
    const prior = existing[0];
    const merged: Partial<InsertSamLead> = {
      name: input.name ?? prior.name ?? undefined,
      email: input.email ?? prior.email ?? undefined,
      shopName: input.shopName ?? prior.shopName ?? undefined,
      city: input.city ?? prior.city ?? undefined,
      intent: input.intent ?? prior.intent,
      intentSummary: input.intentSummary ?? prior.intentSummary ?? undefined,
      language: input.language ?? prior.language ?? "en",
      marketingConsent:
        input.marketingConsent ?? prior.marketingConsent ?? false,
      conversationId: input.conversationId ?? prior.conversationId ?? undefined,
      callCount: (prior.callCount ?? 0) + 1,
      lastCalledAt: new Date(),
      updatedAt: new Date(),
    };
    await db.update(samLeads).set(merged).where(eq(samLeads.id, prior.id));
    leadId = prior.id;
  } else {
    const inserted = await db
      .insert(samLeads)
      .values({
        callerPhone: phone,
        name: input.name,
        email: input.email,
        shopName: input.shopName,
        city: input.city,
        intent: input.intent ?? "other",
        intentSummary: input.intentSummary,
        language: input.language ?? "en",
        marketingConsent: input.marketingConsent ?? false,
        conversationId: input.conversationId,
      })
      .returning({ id: samLeads.id });
    leadId = inserted[0].id;
  }

  // Best-effort HubSpot push (non-blocking errors)
  let hubspotContactId: string | null = null;
  if (HUBSPOT_KEY) {
    try {
      hubspotContactId = await pushLeadToHubspot({ ...input, callerPhone: phone });
      if (hubspotContactId) {
        await db
          .update(samLeads)
          .set({ hubspotContactId, updatedAt: new Date() })
          .where(eq(samLeads.id, leadId));
      }
    } catch (err) {
      console.error("[SAM-TOOLS] HubSpot push failed:", err);
    }
  }

  return { leadId, hubspotContactId, isReturningCaller };
}

/**
 * Push a Sam lead to Baylio's own HubSpot account (the platform CRM).
 * Distinct from per-shop HubSpot integrations — this uses the global key.
 */
async function pushLeadToHubspot(
  input: CaptureLeadInput
): Promise<string | null> {
  if (!HUBSPOT_KEY) return null;

  const client = new Client({ accessToken: HUBSPOT_KEY });
  const phone = input.callerPhone;
  const nameParts = (input.name || "").split(" ");
  const firstname = nameParts[0] || "Unknown";
  const lastname = nameParts.slice(1).join(" ") || "";

  // Search by phone first
  let contactId: string | null = null;
  try {
    const search = await client.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "phone",
              operator: "EQ" as never,
              value: phone,
            },
          ],
        },
      ],
      properties: ["phone", "firstname", "lastname", "email"],
      limit: 1,
    });
    if (search.results.length > 0) {
      contactId = search.results[0].id;
    }
  } catch (err: unknown) {
    console.error("[SAM-TOOLS][HUBSPOT] search failed:", err);
  }

  const properties: Record<string, string> = {
    phone,
    firstname,
    ...(lastname ? { lastname } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.shopName ? { company: input.shopName } : {}),
    ...(input.city ? { city: input.city } : {}),
    hs_lead_status: contactId ? "OPEN" : "NEW",
    lifecyclestage: "lead",
    baylio_source: "sam_sales_call",
    ...(input.intent ? { baylio_lead_intent: input.intent } : {}),
  };

  try {
    if (contactId) {
      await client.crm.contacts.basicApi.update(contactId, { properties });
    } else {
      const created = await client.crm.contacts.basicApi.create({ properties });
      contactId = created.id;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SAM-TOOLS][HUBSPOT] upsert failed:", msg);
    return null;
  }

  // Attach a note with the call summary
  if (contactId && input.intentSummary) {
    try {
      await client.crm.objects.notes.basicApi.create({
        properties: {
          hs_note_body: `[Sam call] ${input.intentSummary}\n\nIntent: ${input.intent || "other"}\nLanguage: ${input.language || "en"}\nMarketing consent: ${input.marketingConsent ? "yes" : "no"}`,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED" as never,
                associationTypeId: 202,
              },
            ],
          },
        ],
      });
    } catch (err: unknown) {
      console.error("[SAM-TOOLS][HUBSPOT] note attach failed:", err);
    }
  }

  return contactId;
}

interface SmsFollowupInput {
  callerPhone: string;
  contentSummary: string;
  marketingConsent: boolean;
}

/**
 * Send a follow-up SMS to the caller. Always honors marketing consent flag.
 */
export async function sendSmsFollowup(
  input: SmsFollowupInput
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const phone = input.callerPhone.replace(/[^\d+]/g, "");
  if (!phone) return { success: false, error: "Invalid phone" };

  const consentSuffix = input.marketingConsent
    ? "\n\nReply STOP to opt out."
    : "";

  const body =
    `Hey, it's Sam from Baylio 👋\n\n${input.contentSummary}\n\n` +
    `More info: baylio.io` +
    consentSuffix;

  const result = await sendSMS({ to: phone, body });

  // Mark on lead row
  if (result.success) {
    try {
      const db = await getDb();
      if (db) {
        await db
          .update(samLeads)
          .set({ smsSent: true, updatedAt: new Date() })
          .where(eq(samLeads.callerPhone, phone));
      }
    } catch {}
  }

  return result;
}

interface EmailFollowupInput {
  callerPhone: string;
  email: string;
  contentSummary: string;
  marketingConsent: boolean;
}

/**
 * Send a follow-up email via Resend. No-op if RESEND_API_KEY missing.
 */
export async function sendEmailFollowup(
  input: EmailFollowupInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!RESEND_KEY) {
    console.warn("[SAM-TOOLS] RESEND_API_KEY missing — email not sent");
    return { success: false, error: "Resend not configured" };
  }

  const resend = new Resend(RESEND_KEY);
  const consentLine = input.marketingConsent
    ? `<p style="color:#888;font-size:11px;margin-top:24px">You agreed to receive occasional emails from Baylio. <a href="mailto:hello@baylio.io?subject=unsubscribe">Unsubscribe</a>.</p>`
    : "";

  try {
    const result = await resend.emails.send({
      from: "Sam from Baylio <sam@baylio.io>",
      to: [input.email],
      replyTo: "hello@baylio.io",
      subject: "Baylio — quick recap from our call",
      html: `
        <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:auto;color:#111">
          <p>Hey,</p>
          <p>Sam here — Baylio's AI agent. Great chatting with you. Here's the recap from our call:</p>
          <div style="background:#f7f7f7;padding:16px;border-radius:8px;white-space:pre-line">${escapeHtml(input.contentSummary)}</div>
          <p>Pricing &amp; features: <a href="https://baylio.io">baylio.io</a></p>
          <p>If you want to chat with a real human, just reply to this email or call back anytime.</p>
          <p>— Sam<br/>Baylio</p>
          ${consentLine}
        </div>
      `,
      text: `Hey,\n\nSam here from Baylio. Recap from our call:\n\n${input.contentSummary}\n\nMore info: baylio.io\n\nReply anytime to talk to a human.\n\n— Sam`,
    });

    // Mark on lead row
    try {
      const db = await getDb();
      if (db) {
        await db
          .update(samLeads)
          .set({
            email: input.email,
            emailSent: true,
            updatedAt: new Date(),
          })
          .where(eq(samLeads.callerPhone, input.callerPhone.replace(/[^\d+]/g, "")));
      }
    } catch {}

    return { success: true, id: result.data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SAM-TOOLS] Email send failed:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Mark a lead as transferred to a human. The actual transfer TwiML is
 * generated at the route level (returns Twilio markup, not JSON).
 */
export async function markTransferred(callerPhone: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const phone = callerPhone.replace(/[^\d+]/g, "");
    await db
      .update(samLeads)
      .set({ transferredToHuman: true, updatedAt: new Date() })
      .where(eq(samLeads.callerPhone, phone));
  } catch (err) {
    console.error("[SAM-TOOLS] markTransferred failed:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
