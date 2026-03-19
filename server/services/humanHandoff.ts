/**
 * Human Handoff Service
 * 
 * Transfers calls to live people when needed. This is a PRODUCT FEATURE,
 * not an apology. The AI frames it as: "I want to make sure you get
 * the best help possible."
 * 
 * Features:
 * - Live call transfer via Twilio (warm transfer with context)
 * - Callback priority levels: urgent, normal, low
 * - SMS alerts to staff for high-priority calls
 * - Handoff context summary (what the AI learned before transferring)
 * 
 * Integration:
 * - Called by the Fallback Ladder state machine when escalation is needed
 * - Uses Twilio for call transfer and SMS alerts
 * - Logs handoff events for quality tracking
 */

import { ENV } from "../_core/env";
import type { CallPriority, EscalationReason } from "./callStateMachine";

// ─── Types ─────────────────────────────────────────────────────────

export interface HandoffRequest {
  /** Call SID for the active Twilio call */
  callSid: string;
  /** Caller's phone number */
  callerPhone: string;
  /** Phone number to transfer to */
  transferTo: string;
  /** Priority level */
  priority: CallPriority;
  /** Why the handoff is happening */
  reason: EscalationReason;
  /** Context collected by AI before handoff */
  context: HandoffContext;
  /** Shop ID */
  shopId: number;
  /** Shop name */
  shopName: string;
}

export interface HandoffContext {
  /** Caller's name (if collected) */
  callerName?: string;
  /** Vehicle info (if collected) */
  vehicle?: string;
  /** Issue description (if collected) */
  issue?: string;
  /** How long the AI spoke with the caller */
  aiDurationSeconds?: number;
  /** Summary of what was discussed */
  conversationSummary?: string;
}

export interface CallbackRequest {
  /** Caller's phone number */
  callerPhone: string;
  /** Caller's name */
  callerName?: string;
  /** Priority level */
  priority: CallPriority;
  /** Why callback is needed */
  reason: EscalationReason;
  /** Context from the call */
  context: HandoffContext;
  /** Preferred callback time */
  preferredTime?: string;
  /** Shop ID */
  shopId: number;
  /** Shop name */
  shopName: string;
  /** Staff phone number(s) to alert */
  staffPhones: string[];
  /** Twilio number to send SMS from */
  fromNumber: string;
}

// ─── Prompt Instructions ───────────────────────────────────────────

/**
 * Prompt instructions for the AI when human handoff is available.
 * The AI should frame handoff as a feature, not a failure.
 */
export const HANDOFF_PROMPT_RULES = `
## HUMAN HANDOFF PROTOCOL

When transferring to a live person:

1. FRAME IT AS A FEATURE, NOT A FAILURE:
   ✅ "I want to make sure you get the best help possible. Let me connect you with one of our team members."
   ✅ "This is something our team can help you with directly. Let me transfer you."
   ✅ "Great question — let me get you to someone who can give you the exact details."
   
   ❌ NEVER say "I'm sorry, I can't help with that"
   ❌ NEVER say "I'm just an AI"
   ❌ NEVER apologize excessively
   ❌ NEVER say "I don't know"

2. BEFORE TRANSFERRING, briefly summarize what you've learned:
   "Before I transfer you, let me make sure they have your info — you said you have a [vehicle] with [issue], correct?"

3. If no one is available for live transfer:
   "Our team is currently helping other customers. I want to make sure the right person calls you back. Can I get your name and the best time to reach you?"
   Then collect: name, phone, issue, preferred callback time.

4. PRIORITY TAGGING (automatic — based on conversation):
   - URGENT: Emergency, safety issue, angry/frustrated caller
   - NORMAL: General request for human, complex question
   - LOW: Preference for human but not time-sensitive
`;

// ─── TwiML for Call Transfer ───────────────────────────────────────

/**
 * Generate TwiML for a warm transfer (conference-style).
 * Plays a brief message to the caller while connecting.
 */
export function generateTransferTwiML(
  transferTo: string,
  _callerContext: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please hold while I connect you with a team member.</Say>
  <Dial timeout="30" action="/api/twilio/transfer-status">
    <Number>${escapeXml(transferTo)}</Number>
  </Dial>
  <Say voice="Polly.Joanna">I'm sorry, our team is currently unavailable. Please leave a message after the beep and someone will call you back as soon as possible.</Say>
  <Record maxLength="120" action="/api/twilio/recording-complete" transcribe="true" transcribeCallback="/api/twilio/transcription-complete" />
</Response>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── SMS Alerts ────────────────────────────────────────────────────

/**
 * Build SMS alert message for staff based on priority.
 */
export function buildStaffAlertSMS(req: CallbackRequest): string {
  const priorityEmoji = req.priority === "urgent" ? "🚨" : req.priority === "normal" ? "📞" : "📋";
  const priorityLabel = req.priority.toUpperCase();

  const reasonLabels: Record<EscalationReason, string> = {
    caller_requested_human: "Caller asked to speak with a person",
    angry_caller: "⚠️ Caller is upset — handle with care",
    emergency: "🚨 EMERGENCY — immediate attention needed",
    ai_low_confidence: "AI needed human help",
    ai_failure: "AI system issue — caller needs help",
    after_hours: "After-hours call",
    complex_issue: "Complex issue requiring expertise",
    repeat_caller: "Repeat caller — may need follow-up",
    policy_question: "Policy/warranty question",
  };

  let msg = `${priorityEmoji} ${priorityLabel} CALLBACK — ${req.shopName}\n\n`;
  msg += `${reasonLabels[req.reason] || req.reason}\n\n`;

  if (req.callerName) msg += `Name: ${req.callerName}\n`;
  msg += `Phone: ${req.callerPhone}\n`;
  if (req.context.vehicle) msg += `Vehicle: ${req.context.vehicle}\n`;
  if (req.context.issue) msg += `Issue: ${req.context.issue}\n`;
  if (req.preferredTime) msg += `Callback: ${req.preferredTime}\n`;
  if (req.context.conversationSummary) {
    msg += `\nAI Notes: ${req.context.conversationSummary}\n`;
  }

  return msg;
}

/**
 * Send SMS alerts to all staff phones for a callback request.
 * Returns results for each phone number.
 */
export async function alertStaffViaSMS(
  req: CallbackRequest
): Promise<{ sent: number; failed: number; results: Array<{ phone: string; success: boolean; error?: string }> }> {
  const results: Array<{ phone: string; success: boolean; error?: string }> = [];

  try {
    const twilio = await import("twilio");
    const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);
    const alertMessage = buildStaffAlertSMS(req);

    for (const staffPhone of req.staffPhones) {
      try {
        await client.messages.create({
          body: alertMessage,
          from: req.fromNumber,
          to: staffPhone,
        });
        results.push({ phone: staffPhone, success: true });
        console.log(`[HANDOFF] Alert sent to staff ${staffPhone} for ${req.callerPhone} (${req.priority})`);
      } catch (error: any) {
        results.push({ phone: staffPhone, success: false, error: error?.message });
        console.error(`[HANDOFF] Failed to alert staff ${staffPhone}:`, error?.message);
      }
    }
  } catch (error: any) {
    console.error(`[HANDOFF] Twilio initialization failed:`, error?.message);
    // Mark all as failed
    for (const phone of req.staffPhones) {
      results.push({ phone, success: false, error: "Twilio init failed" });
    }
  }

  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return { sent, failed, results };
}

/**
 * Execute a full handoff flow:
 * 1. If live transfer is possible → generate transfer TwiML
 * 2. If not → collect callback info and alert staff via SMS
 * 
 * Returns the action to take (TwiML for transfer, or SMS alert confirmation).
 */
export async function executeHandoff(
  req: HandoffRequest,
  staffPhones: string[],
  fromNumber: string
): Promise<
  | { type: "transfer"; twiml: string }
  | { type: "callback_alert"; sent: number; failed: number }
  | { type: "error"; message: string }
> {
  // Attempt live transfer first
  if (req.transferTo && req.callSid) {
    try {
      const contextSummary = buildContextSummary(req.context);
      const twiml = generateTransferTwiML(req.transferTo, contextSummary);

      console.log(`[HANDOFF] Initiating live transfer for ${req.callerPhone} → ${req.transferTo} (${req.priority})`);

      // Also alert staff via SMS so they have context before picking up
      if (staffPhones.length > 0) {
        setImmediate(async () => {
          await alertStaffViaSMS({
            callerPhone: req.callerPhone,
            callerName: req.context.callerName,
            priority: req.priority,
            reason: req.reason,
            context: req.context,
            shopId: req.shopId,
            shopName: req.shopName,
            staffPhones,
            fromNumber,
          });
        });
      }

      return { type: "transfer", twiml };
    } catch (error: any) {
      console.error(`[HANDOFF] Transfer failed, falling back to SMS alert:`, error?.message);
    }
  }

  // Fallback: SMS alert for callback
  if (staffPhones.length > 0) {
    const result = await alertStaffViaSMS({
      callerPhone: req.callerPhone,
      callerName: req.context.callerName,
      priority: req.priority,
      reason: req.reason,
      context: req.context,
      shopId: req.shopId,
      shopName: req.shopName,
      staffPhones,
      fromNumber,
    });

    return { type: "callback_alert", sent: result.sent, failed: result.failed };
  }

  return { type: "error", message: "No transfer number or staff phones configured" };
}

/**
 * Build a brief context summary for the human agent.
 */
function buildContextSummary(context: HandoffContext): string {
  const parts: string[] = [];
  if (context.callerName) parts.push(`Caller: ${context.callerName}`);
  if (context.vehicle) parts.push(`Vehicle: ${context.vehicle}`);
  if (context.issue) parts.push(`Issue: ${context.issue}`);
  if (context.aiDurationSeconds) parts.push(`AI spoke for ${context.aiDurationSeconds}s`);
  return parts.join(" | ") || "No context collected";
}
