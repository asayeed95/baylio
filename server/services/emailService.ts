/**
 * Email Service
 * Sends email notifications via the Resend API (https://resend.com).
 * Falls back to console logging if RESEND_API_KEY is not configured.
 */
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}): Promise<void> {
  const htmlBody = `
    <h2>New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Name</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.name)}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Email</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.email)}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Phone</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.phone || "Not provided")}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Message</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.message)}</td></tr>
    </table>
    <p style="color:#666;font-size:12px">Submitted at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>
  `;

  if (!resend) {
    console.log("[EmailService] RESEND_API_KEY not set — logging email instead:");
    console.log(`  To: hello@baylio.io`);
    console.log(`  Subject: New Contact Form Submission — ${data.name}`);
    console.log(`  From: ${data.email} | Phone: ${data.phone || "N/A"}`);
    return;
  }

  try {
    const result = await resend.emails.send({
      from: "Baylio Contact Form <hello@baylio.io>",
      to: ["hello@baylio.io"],
      replyTo: data.email,
      subject: `New Contact Form Submission — ${data.name}`,
      html: htmlBody,
      text: `New contact form submission:\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "Not provided"}\nMessage: ${data.message}`,
    });

    console.log("[EmailService] Contact notification sent via Resend:", result.data?.id);
  } catch (err) {
    // Never throw — email failure should not break the form submission
    console.error("[EmailService] Failed to send via Resend:", err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Auto-acknowledge an inbound support email.
 * Tells the sender we received it and will respond soon.
 */
export async function sendSupportAutoAck(data: {
  toEmail: string;
  toName?: string | null;
  originalSubject?: string | null;
  ticketId: number;
}): Promise<void> {
  const displayName = data.toName || data.toEmail.split("@")[0];
  const subject = data.originalSubject
    ? `Re: ${data.originalSubject}`
    : "We got your message — Baylio";

  const htmlBody = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <p>Hey ${escapeHtml(displayName)},</p>
      <p>Thanks for reaching out to Baylio. We got your message and our team is on it.</p>
      <p>Here's how it works:</p>
      <ul style="line-height:1.7">
        <li>Small requests (typos, copy changes, new languages) usually ship the same day.</li>
        <li>Bigger features get a reply with a timeline within 24 hours.</li>
        <li>Urgent production issues get paged immediately.</li>
      </ul>
      <p>We'll reply directly to this thread. Reference #${data.ticketId}.</p>
      <p>— Baylio Support</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p style="font-size:12px;color:#888">Baylio · AI phone receptionist for auto repair shops · baylio.io</p>
    </div>
  `;

  const textBody = [
    `Hey ${displayName},`,
    "",
    "Thanks for reaching out to Baylio. We got your message and our team is on it.",
    "",
    "Here's how it works:",
    " - Small requests (typos, copy changes, new languages) usually ship the same day.",
    " - Bigger features get a reply with a timeline within 24 hours.",
    " - Urgent production issues get paged immediately.",
    "",
    `We'll reply directly to this thread. Reference #${data.ticketId}.`,
    "",
    "— Baylio Support",
  ].join("\n");

  if (!resend) {
    console.log("[EmailService] No RESEND_API_KEY — would send auto-ack to", data.toEmail, "ticket", data.ticketId);
    return;
  }

  try {
    await resend.emails.send({
      from: "Baylio Support <support@baylio.io>",
      to: [data.toEmail],
      replyTo: "support@baylio.io",
      subject,
      html: htmlBody,
      text: textBody,
    });
    console.log("[EmailService] Auto-ack sent to", data.toEmail, "ticket", data.ticketId);
  } catch (err) {
    console.error("[EmailService] Auto-ack send failed:", err);
  }
}

/**
 * Reply to a support ticket sender from /admin/requests.
 */
export async function sendSupportReply(data: {
  toEmail: string;
  toName?: string | null;
  subject: string;
  body: string;
  ticketId: number;
}): Promise<void> {
  const htmlBody = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;white-space:pre-wrap">${escapeHtml(data.body)}</div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
    <p style="font-size:12px;color:#888">Baylio · Reference #${data.ticketId}</p>
  `;

  if (!resend) {
    console.log("[EmailService] No RESEND_API_KEY — would send reply to", data.toEmail);
    return;
  }

  await resend.emails.send({
    from: "Baylio Support <support@baylio.io>",
    to: [data.toEmail],
    replyTo: "support@baylio.io",
    subject: data.subject,
    html: htmlBody,
    text: data.body,
  });
}

/**
 * Trial lifecycle emails.
 *
 * Sent from hello@baylio.io (marketing/lifecycle origin) with replies routed
 * to support@baylio.io so the team picks them up in the regular queue.
 *
 * Each helper is idempotent at the call site — the caller must guard against
 * double-sending via the shops.trialDayXEmailSentAt columns before invoking.
 */

type TrialEmailInput = {
  toEmail: string;
  toName?: string | null;
  shopName: string;
  trialEndsAt: Date;
};

function formatTrialEndDate(trialEndsAt: Date): string {
  return trialEndsAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function trialWrap(inner: string): string {
  return `<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.6">${inner}<hr style="border:none;border-top:1px solid #eee;margin:24px 0" /><p style="font-size:12px;color:#888">Baylio · AI phone receptionist for auto repair shops · <a href="https://baylio.io" style="color:#888">baylio.io</a></p></div>`;
}

async function sendTrialEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  tag: string;
}): Promise<boolean> {
  if (!resend) {
    console.log(`[EmailService] No RESEND_API_KEY — would send ${params.tag} to ${params.to}`);
    return false;
  }
  try {
    const result = await resend.emails.send({
      from: "Baylio <hello@baylio.io>",
      to: [params.to],
      replyTo: "support@baylio.io",
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    console.log(`[EmailService] ${params.tag} sent to ${params.to}:`, result.data?.id);
    return true;
  } catch (err) {
    console.error(`[EmailService] ${params.tag} send failed:`, err);
    return false;
  }
}

export async function sendTrialDay7Email(data: TrialEmailInput): Promise<boolean> {
  const name = data.toName || data.toEmail.split("@")[0];
  const endsOn = formatTrialEndDate(data.trialEndsAt);
  const subject = `You're halfway through your Baylio trial`;

  const html = trialWrap(`
    <p>Hey ${escapeHtml(name)},</p>
    <p>You're 7 days into your Baylio trial at <strong>${escapeHtml(data.shopName)}</strong>. Your trial runs until <strong>${escapeHtml(endsOn)}</strong>.</p>
    <p>A few things worth checking before your trial ends:</p>
    <ul>
      <li>Review your call logs — any callers you would have missed?</li>
      <li>Listen to a transcript and check how Baylio handled the conversation.</li>
      <li>Book an appointment through a test call to see the flow end-to-end.</li>
    </ul>
    <p>Questions or want a walkthrough? Just reply to this email — a real person reads every reply.</p>
    <p>— The Baylio team</p>
  `);

  const text = [
    `Hey ${name},`,
    "",
    `You're 7 days into your Baylio trial at ${data.shopName}. Your trial runs until ${endsOn}.`,
    "",
    "A few things worth checking before your trial ends:",
    " - Review your call logs — any callers you would have missed?",
    " - Listen to a transcript and check how Baylio handled the conversation.",
    " - Book an appointment through a test call to see the flow end-to-end.",
    "",
    "Questions or want a walkthrough? Just reply to this email.",
    "",
    "— The Baylio team",
  ].join("\n");

  return sendTrialEmail({ to: data.toEmail, subject, html, text, tag: "Trial day 7" });
}

export async function sendTrialDay12Email(data: TrialEmailInput): Promise<boolean> {
  const name = data.toName || data.toEmail.split("@")[0];
  const endsOn = formatTrialEndDate(data.trialEndsAt);
  const subject = `2 days left on your Baylio trial`;

  const html = trialWrap(`
    <p>Hey ${escapeHtml(name)},</p>
    <p>Heads up — your Baylio trial for <strong>${escapeHtml(data.shopName)}</strong> ends in <strong>2 days</strong> (on ${escapeHtml(endsOn)}).</p>
    <p>When the trial ends, incoming callers will hear a voicemail instead of your AI receptionist. To keep Baylio answering your phone, pick a plan before ${escapeHtml(endsOn)}:</p>
    <p style="margin:24px 0">
      <a href="https://baylio.io/pricing" style="background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Choose your plan</a>
    </p>
    <p>Want to talk through which plan fits your shop? Just reply — happy to help.</p>
    <p>— The Baylio team</p>
  `);

  const text = [
    `Hey ${name},`,
    "",
    `Heads up — your Baylio trial for ${data.shopName} ends in 2 days (on ${endsOn}).`,
    "",
    "When the trial ends, incoming callers will hear a voicemail instead of your AI receptionist. To keep Baylio answering your phone, pick a plan before the trial ends:",
    "",
    "https://baylio.io/pricing",
    "",
    "Want to talk through which plan fits your shop? Just reply.",
    "",
    "— The Baylio team",
  ].join("\n");

  return sendTrialEmail({ to: data.toEmail, subject, html, text, tag: "Trial day 12" });
}

export async function sendTrialDay13Email(data: TrialEmailInput): Promise<boolean> {
  const name = data.toName || data.toEmail.split("@")[0];
  const endsOn = formatTrialEndDate(data.trialEndsAt);
  const subject = `Your Baylio trial ends tomorrow`;

  const html = trialWrap(`
    <p>Hey ${escapeHtml(name)},</p>
    <p>Your Baylio trial for <strong>${escapeHtml(data.shopName)}</strong> ends <strong>tomorrow</strong> (${escapeHtml(endsOn)}).</p>
    <p>If you don't pick a plan by then, incoming callers will hit a voicemail instead of your AI receptionist — which means every missed call after that is a real missed opportunity.</p>
    <p style="margin:24px 0">
      <a href="https://baylio.io/pricing" style="background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Choose your plan</a>
    </p>
    <p>Takes about a minute. If you need a hand or want to compare plans, reply to this email.</p>
    <p>— The Baylio team</p>
  `);

  const text = [
    `Hey ${name},`,
    "",
    `Your Baylio trial for ${data.shopName} ends tomorrow (${endsOn}).`,
    "",
    "If you don't pick a plan by then, incoming callers will hit a voicemail instead of your AI receptionist — which means every missed call after that is a real missed opportunity.",
    "",
    "Choose your plan: https://baylio.io/pricing",
    "",
    "Takes about a minute. If you need a hand, reply to this email.",
    "",
    "— The Baylio team",
  ].join("\n");

  return sendTrialEmail({ to: data.toEmail, subject, html, text, tag: "Trial day 13" });
}

export async function sendTrialDay14Email(data: TrialEmailInput): Promise<boolean> {
  const name = data.toName || data.toEmail.split("@")[0];
  const subject = `Your Baylio trial has ended`;

  const html = trialWrap(`
    <p>Hey ${escapeHtml(name)},</p>
    <p>Your Baylio trial for <strong>${escapeHtml(data.shopName)}</strong> has ended. Right now, callers to your Baylio number are hearing a voicemail instead of your AI receptionist.</p>
    <p>Your shop settings, agent configuration, and call history are all saved. Pick a plan and Baylio picks up the next call.</p>
    <p style="margin:24px 0">
      <a href="https://baylio.io/pricing" style="background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reactivate Baylio</a>
    </p>
    <p>Not sure which plan, or want to extend your trial? Reply — we're happy to figure it out with you.</p>
    <p>— The Baylio team</p>
  `);

  const text = [
    `Hey ${name},`,
    "",
    `Your Baylio trial for ${data.shopName} has ended. Right now, callers to your Baylio number are hearing a voicemail instead of your AI receptionist.`,
    "",
    "Your shop settings, agent configuration, and call history are all saved. Pick a plan and Baylio picks up the next call.",
    "",
    "Reactivate: https://baylio.io/pricing",
    "",
    "Not sure which plan, or want to extend? Reply — happy to help.",
    "",
    "— The Baylio team",
  ].join("\n");

  return sendTrialEmail({ to: data.toEmail, subject, html, text, tag: "Trial day 14" });
}
