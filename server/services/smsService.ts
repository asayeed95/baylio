/**
 * SMS Service
 *
 * Sends SMS notifications to shop owners via Twilio.
 * Used for:
 * 1. Post-call recaps — After each AI-handled call, send a brief
 *    summary to the shop owner with caller info, intent, and outcome
 * 2. High-value lead alerts — Immediate notification when a high-value
 *    customer calls (e.g., fleet vehicle, expensive repair)
 * 3. Weekly performance summaries — Digest of the week's call metrics
 * 4. Missed call audit alerts — During the 7-day audit, notify when
 *    calls are being missed
 *
 * All SMS are sent from the shop's Twilio number (or a shared Baylio
 * number if the shop doesn't have one provisioned yet).
 */

import { ENV } from "../_core/env";

interface SMSPayload {
  to: string;
  body: string;
  from?: string; // defaults to BAYLIO_SMS_FROM or shop's Twilio number
}

interface PostCallRecap {
  shopOwnerPhone: string;
  callerPhone: string;
  callerName?: string;
  callDuration: number; // seconds
  intent: string;
  outcome: string;
  appointmentBooked: boolean;
  upsellOffered?: string;
  upsellAccepted?: boolean;
  estimatedValue?: number;
}

/**
 * Send an SMS via Twilio REST API.
 *
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER
 * environment variables to be set.
 */
export async function sendSMS(
  payload: SMSPayload
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const defaultFrom = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    console.warn("[SMS] Twilio credentials not configured. SMS not sent.");
    return { success: false, error: "Twilio credentials not configured" };
  }

  const from = payload.from || defaultFrom;
  if (!from) {
    return { success: false, error: "No 'from' phone number configured" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: payload.to,
        From: from,
        Body: payload.body,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[SMS] Twilio API error:", errorData);
      return { success: false, error: `Twilio API error: ${response.status}` };
    }

    const data = (await response.json()) as { sid: string };
    return { success: true, sid: data.sid };
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Format and send a post-call recap SMS to the shop owner.
 *
 * Example output:
 * "📞 New Call | Baylio
 * Caller: (555) 123-4567 - John
 * Intent: Brake inspection
 * Outcome: Appointment booked for tomorrow 2pm
 * Upsell: Fluid flush offered ✓ accepted
 * Est. value: $485
 * Duration: 3m 42s"
 */
export async function sendPostCallRecap(
  recap: PostCallRecap
): Promise<{ success: boolean }> {
  const duration = `${Math.floor(recap.callDuration / 60)}m ${recap.callDuration % 60}s`;

  let body = `New Call | Baylio\n`;
  body += `Caller: ${recap.callerPhone}`;
  if (recap.callerName) body += ` - ${recap.callerName}`;
  body += `\n`;
  body += `Intent: ${recap.intent}\n`;
  body += `Outcome: ${recap.outcome}\n`;

  if (recap.appointmentBooked) {
    body += `Appointment: Booked\n`;
  }

  if (recap.upsellOffered) {
    body += `Upsell: ${recap.upsellOffered}`;
    if (recap.upsellAccepted !== undefined) {
      body += recap.upsellAccepted ? " (accepted)" : " (declined)";
    }
    body += `\n`;
  }

  if (recap.estimatedValue) {
    body += `Est. value: $${recap.estimatedValue}\n`;
  }

  body += `Duration: ${duration}`;

  return sendSMS({
    to: recap.shopOwnerPhone,
    body,
  });
}

/**
 * Send a high-value lead alert.
 * Triggered when the AI detects a high-value opportunity
 * (fleet vehicle, expensive repair, multiple services).
 */
export async function sendHighValueAlert(
  shopOwnerPhone: string,
  callerPhone: string,
  reason: string,
  estimatedValue: number
): Promise<{ success: boolean }> {
  const body = [
    `HIGH VALUE LEAD | Baylio`,
    `Caller: ${callerPhone}`,
    `Reason: ${reason}`,
    `Est. value: $${estimatedValue}`,
    `Action: Call back within 15 minutes for best conversion.`,
  ].join("\n");

  return sendSMS({ to: shopOwnerPhone, body });
}

/**
 * Send a weekly performance summary SMS.
 */
export async function sendWeeklySummary(
  shopOwnerPhone: string,
  shopName: string,
  metrics: {
    totalCalls: number;
    answeredByAI: number;
    appointmentsBooked: number;
    estimatedRevenue: number;
    missedCalls: number;
  }
): Promise<{ success: boolean }> {
  const answerRate =
    metrics.totalCalls > 0
      ? Math.round((metrics.answeredByAI / metrics.totalCalls) * 100)
      : 0;

  const body = [
    `Weekly Report | ${shopName}`,
    `Total calls: ${metrics.totalCalls}`,
    `AI answered: ${metrics.answeredByAI} (${answerRate}%)`,
    `Appointments: ${metrics.appointmentsBooked}`,
    `Est. revenue: $${metrics.estimatedRevenue.toLocaleString()}`,
    `Missed: ${metrics.missedCalls}`,
    ``,
    `View full report at baylio.io`,
  ].join("\n");

  return sendSMS({ to: shopOwnerPhone, body });
}
