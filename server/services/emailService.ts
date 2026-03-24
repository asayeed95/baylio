/**
 * Email Service
 * Sends email notifications via SMTP (nodemailer).
 * Falls back to JSON logging if SMTP_HOST is not configured.
 */
import nodemailer from "nodemailer";

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      ...(process.env.SMTP_USER
        ? {
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS || "",
            },
          }
        : {}),
    })
  : nodemailer.createTransport({ jsonTransport: true } as any);

export async function sendContactNotification(data: {
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}): Promise<void> {
  const mailOptions = {
    from: '"Baylio Contact Form" <noreply@baylio.io>',
    to: "hello@baylio.io",
    subject: `New Contact Form Submission — ${data.name}`,
    html: `
      <h2>New Contact Form Submission</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Name</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Email</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.email)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Phone</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.phone || "Not provided")}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><strong>Message</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.message)}</td></tr>
      </table>
      <p style="color:#666;font-size:12px">Submitted at ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>
    `,
    text: `New contact form submission:\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "Not provided"}\nMessage: ${data.message}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(
      "[EmailService] Contact notification sent:",
      info.messageId || "logged"
    );
  } catch (err) {
    // Never throw — email failure should not break the form submission
    console.error("[EmailService] Failed to send contact notification:", err);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
