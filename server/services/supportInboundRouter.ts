/**
 * Support Inbound Webhook
 *
 * Resend posts inbound emails (support@baylio.io) as JSON to this endpoint.
 * Pipeline: store → triage via Claude → auto-ack sender.
 *
 * Resend inbound payload shape (as of 2026-04, their `email.received` event):
 *   {
 *     type: "email.received",
 *     data: {
 *       from: { email, name? },
 *       to: [{ email, name? }],
 *       subject,
 *       text,
 *       html,
 *       message_id,
 *       created_at,
 *     }
 *   }
 *
 * Webhook signature verification uses the Svix headers Resend sends:
 *   svix-id, svix-timestamp, svix-signature
 * Secret lives in RESEND_WEBHOOK_SECRET. If not set, we skip verification
 * and log a warning — fine for initial setup, must be set before launch.
 */

import { Router } from "express";
import crypto from "node:crypto";
import { createSupportTicket, updateSupportTicket } from "../db";
import { triageSupportTicket } from "./supportTriageService";
import { sendSupportAutoAck } from "./emailService";

export const supportInboundRouter = Router();

type ResendInboundPayload = {
  type?: string;
  data?: {
    from?: { email?: string; name?: string | null };
    to?: Array<{ email?: string; name?: string | null }>;
    subject?: string;
    text?: string;
    html?: string;
    message_id?: string;
    created_at?: string;
  };
};

function verifySvixSignature(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[SUPPORT-INBOUND] RESEND_WEBHOOK_SECRET not set — skipping signature verification");
    return true;
  }

  const svixId = headers["svix-id"];
  const svixTimestamp = headers["svix-timestamp"];
  const svixSignature = headers["svix-signature"];

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.warn("[SUPPORT-INBOUND] Missing Svix headers");
    return false;
  }

  const id = Array.isArray(svixId) ? svixId[0] : svixId;
  const ts = Array.isArray(svixTimestamp) ? svixTimestamp[0] : svixTimestamp;
  const sig = Array.isArray(svixSignature) ? svixSignature[0] : svixSignature;

  const signedContent = `${id}.${ts}.${rawBody}`;
  const secretBytes = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice(6), "base64")
    : Buffer.from(secret, "utf8");
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  const provided = sig.split(" ").map(part => part.split(",")[1]).filter(Boolean);
  return provided.some(candidate => {
    try {
      return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
    } catch {
      return false;
    }
  });
}

supportInboundRouter.post("/inbound", async (req, res) => {
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

  if (!verifySvixSignature(rawBody, req.headers)) {
    console.warn("[SUPPORT-INBOUND] Signature verification failed");
    return res.status(401).json({ error: "invalid signature" });
  }

  let payload: ResendInboundPayload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "invalid json" });
  }

  if (payload.type && payload.type !== "email.received" && payload.type !== "inbound_email.received") {
    return res.status(200).json({ ignored: true, type: payload.type });
  }

  const data = payload.data;
  const fromEmail = data?.from?.email;
  if (!fromEmail) {
    return res.status(400).json({ error: "missing from email" });
  }

  const subject = data?.subject ?? null;
  const body = data?.text || stripHtml(data?.html ?? "") || "(empty body)";
  const bodyHtml = data?.html ?? null;
  const messageId = data?.message_id ?? null;
  const fromName = data?.from?.name ?? null;

  const ticketId = await createSupportTicket({
    fromEmail,
    fromName,
    subject: subject ?? undefined,
    body,
    bodyHtml: bodyHtml ?? undefined,
    messageId: messageId ?? undefined,
    status: "new",
  });

  if (!ticketId) {
    console.error("[SUPPORT-INBOUND] Failed to create ticket — DB unavailable");
    return res.status(500).json({ error: "db unavailable" });
  }

  res.status(200).json({ ok: true, ticketId });

  // Fire-and-forget post-processing
  setImmediate(async () => {
    try {
      const triage = await triageSupportTicket({ subject, body, fromEmail });
      if (triage) {
        await updateSupportTicket(ticketId, {
          category: triage.category,
          priority: triage.priority,
          summary: triage.summary,
          status: "triaged",
          triagedAt: new Date(),
        });
        console.log(`[SUPPORT-INBOUND] Triaged ticket ${ticketId}: ${triage.category}/${triage.priority}`);
      }
    } catch (err) {
      console.error("[SUPPORT-INBOUND] Triage post-process failed:", err);
    }

    try {
      await sendSupportAutoAck({
        toEmail: fromEmail,
        toName: fromName,
        originalSubject: subject,
        ticketId,
      });
      await updateSupportTicket(ticketId, { autoAckSentAt: new Date() });
    } catch (err) {
      console.error("[SUPPORT-INBOUND] Auto-ack failed:", err);
    }
  });
});

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
