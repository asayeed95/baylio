/**
 * Sam Tools Router (`/api/sam/*`)
 *
 * Endpoints called by Sam (ElevenLabs custom webhook tools) during a live
 * conversation. Each request is authenticated with the SAM_TOOL_SECRET
 * shared header to prevent unauthorized invocation.
 *
 * Configure these in Sam's ElevenLabs agent — see scripts/setup-sam.mjs.
 *
 * Routes:
 *   POST /api/sam/lead       — capture_lead
 *   POST /api/sam/sms        — send_sms_followup
 *   POST /api/sam/email      — send_email_followup
 *   POST /api/sam/onboard    — start_onboarding_assist
 *   POST /api/sam/transfer   — transfer_to_human (returns TwiML for redirect)
 */
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ENV } from "../_core/env";
import {
  captureLead,
  markTransferred,
  sendEmailFollowup,
  sendSmsFollowup,
} from "./samToolsService";

export const samToolsRouter = Router();

// Founder's phone — destination for transfer_to_human
const FOUNDER_PHONE = process.env.FOUNDER_PHONE || "+12013212235";

// ─── Auth middleware ────────────────────────────────────────────────

function authSamTool(req: Request, res: Response, next: NextFunction): void {
  const secret = ENV.samToolSecret;

  // Skip auth in dev if no secret configured (allows local testing)
  if (!secret) {
    if (ENV.isProduction) {
      console.error("[SAM-TOOLS] SAM_TOOL_SECRET missing in production");
      res.status(503).json({ error: "tool secret not configured" });
      return;
    }
    next();
    return;
  }

  const provided =
    req.header("x-sam-tool-secret") ||
    req.header("authorization")?.replace(/^Bearer\s+/i, "");

  if (provided !== secret) {
    console.warn("[SAM-TOOLS] Unauthorized tool call");
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

samToolsRouter.use(authSamTool);

// ─── Schemas ────────────────────────────────────────────────────────

const intentEnum = z.enum([
  "shop_owner_prospect",
  "curious_tester",
  "car_question",
  "existing_customer",
  "onboarding_help",
  "other",
]);

const leadSchema = z.object({
  caller_phone: z.string().min(7),
  name: z.string().optional(),
  email: z.string().email().optional(),
  shop_name: z.string().optional(),
  city: z.string().optional(),
  intent: intentEnum.optional(),
  intent_summary: z.string().optional(),
  language: z.string().optional(),
  marketing_consent: z.boolean().optional(),
  conversation_id: z.string().optional(),
});

const smsSchema = z.object({
  caller_phone: z.string().min(7),
  content_summary: z.string().min(1).max(800),
  marketing_consent: z.boolean().optional(),
});

const emailSchema = z.object({
  caller_phone: z.string().min(7),
  email: z.string().email(),
  content_summary: z.string().min(1).max(2000),
  marketing_consent: z.boolean().optional(),
});

const onboardSchema = z.object({
  caller_phone: z.string().min(7),
  name: z.string().optional(),
  email: z.string().email().optional(),
  language: z.string().optional(),
  notes: z.string().optional(),
});

const transferSchema = z.object({
  caller_phone: z.string().min(7),
  reason: z.string().optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────

samToolsRouter.post("/lead", async (req: Request, res: Response) => {
  const parsed = leadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const result = await captureLead({
    callerPhone: d.caller_phone,
    name: d.name,
    email: d.email,
    shopName: d.shop_name,
    city: d.city,
    intent: d.intent,
    intentSummary: d.intent_summary,
    language: d.language,
    marketingConsent: d.marketing_consent ?? false,
    conversationId: d.conversation_id,
  });

  if (!result) {
    res.status(500).json({ ok: false, message: "Failed to save lead" });
    return;
  }

  res.json({
    ok: true,
    lead_id: result.leadId,
    hubspot_contact_id: result.hubspotContactId,
    is_returning_caller: result.isReturningCaller,
    message: result.isReturningCaller
      ? "Lead updated (returning caller)."
      : "Lead saved.",
  });
});

samToolsRouter.post("/sms", async (req: Request, res: Response) => {
  const parsed = smsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const result = await sendSmsFollowup({
    callerPhone: d.caller_phone,
    contentSummary: d.content_summary,
    marketingConsent: d.marketing_consent ?? false,
  });
  res.json({
    ok: result.success,
    sms_sid: result.sid,
    message: result.success
      ? "SMS sent — caller should receive it shortly."
      : `SMS failed: ${result.error || "unknown error"}`,
  });
});

samToolsRouter.post("/email", async (req: Request, res: Response) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const result = await sendEmailFollowup({
    callerPhone: d.caller_phone,
    email: d.email,
    contentSummary: d.content_summary,
    marketingConsent: d.marketing_consent ?? false,
  });
  res.json({
    ok: result.success,
    email_id: result.id,
    message: result.success
      ? "Email sent."
      : `Email failed: ${result.error || "unknown error"}`,
  });
});

samToolsRouter.post("/onboard", async (req: Request, res: Response) => {
  const parsed = onboardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;
  const result = await captureLead({
    callerPhone: d.caller_phone,
    name: d.name,
    email: d.email,
    intent: "onboarding_help",
    intentSummary: d.notes
      ? `Onboarding requested. Notes: ${d.notes}`
      : "Onboarding assistance requested",
    language: d.language,
    marketingConsent: true,
  });

  res.json({
    ok: !!result,
    lead_id: result?.leadId,
    message:
      "Onboarding flagged. The Baylio team will reach out within one business day to walk through setup.",
  });
});

/**
 * transfer_to_human — instructs ElevenLabs to hand off the call.
 *
 * ElevenLabs supports tool-driven call transfers via TwiML. We return
 * structured guidance the agent can speak, plus a transfer instruction.
 * The actual <Dial> happens via the ElevenLabs platform's built-in
 * transfer mechanism (configured in the agent), but we also expose
 * raw TwiML at /transfer.twiml for direct webhook scenarios.
 */
samToolsRouter.post("/transfer", async (req: Request, res: Response) => {
  const parsed = transferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", details: parsed.error.flatten() });
    return;
  }
  const d = parsed.data;

  await markTransferred(d.caller_phone);

  res.json({
    ok: true,
    transfer_number: FOUNDER_PHONE,
    message: `Transferring to Abdur at ${FOUNDER_PHONE} now. Tell the caller "hold on one sec, connecting you."`,
  });
});

/**
 * Raw TwiML endpoint Twilio can <Redirect> to for the actual transfer.
 * Public (no auth) because Twilio hits it — protected by URL obscurity +
 * the fact that it only dials a hardcoded number.
 */
export const samTwimlRouter = Router();
samTwimlRouter.post("/transfer.twiml", (_req: Request, res: Response) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Hold on one sec, connecting you to Abdur now.</Say>
  <Dial timeout="25" answerOnBridge="true">
    <Number>${FOUNDER_PHONE}</Number>
  </Dial>
  <Say voice="Polly.Joanna">Looks like Abdur didn't pick up. He'll call you right back.</Say>
</Response>`;
  res.type("text/xml").send(twiml);
});
