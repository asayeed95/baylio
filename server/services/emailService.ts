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
