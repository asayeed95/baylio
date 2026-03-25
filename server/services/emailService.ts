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
