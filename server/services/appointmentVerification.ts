/**
 * Appointment Verification Service
 * 
 * CRITICAL RULE: The AI must NEVER say "confirmed." Only "requested."
 * 
 * Flow:
 * 1. AI collects appointment details from caller
 * 2. AI says: "I have submitted your appointment request for [date/time].
 *    You will receive a confirmation text shortly."
 * 3. System sends SMS to SHOP OWNER with appointment details + confirm/deny links
 * 4. Shop owner confirms or denies via SMS reply
 * 5. System sends confirmation/reschedule SMS to CALLER
 * 
 * This ensures the shop always has final say on scheduling.
 * The AI is a receptionist, not a scheduler.
 */

import { ENV } from "../_core/env";

// ─── Types ─────────────────────────────────────────────────────────

export interface AppointmentRequest {
  /** Caller's name */
  callerName: string;
  /** Caller's phone number */
  callerPhone: string;
  /** Vehicle year, make, model */
  vehicle: string;
  /** Service requested or issue description */
  serviceRequested: string;
  /** Requested date (e.g., "Tuesday") */
  requestedDate: string;
  /** Requested time (e.g., "10am") */
  requestedTime: string;
  /** Whether they need a ride/loaner */
  needsTransportation?: boolean;
  /** Additional notes from the call */
  notes?: string;
  /** Shop ID this appointment is for */
  shopId: number;
  /** Shop owner's phone number */
  shopOwnerPhone: string;
  /** Shop name for SMS messages */
  shopName: string;
}

export interface AppointmentStatus {
  id: string;
  status: "requested" | "confirmed" | "denied" | "rescheduled";
  request: AppointmentRequest;
  createdAt: number;
  respondedAt?: number;
  shopResponse?: string;
}

// ─── Prompt Instructions ───────────────────────────────────────────

/**
 * Prompt instructions that enforce the "requested not confirmed" rule.
 * These are injected into the shop agent's system prompt.
 */
export const APPOINTMENT_PROMPT_RULES = `
## APPOINTMENT BOOKING RULES (MANDATORY — CANNOT BE OVERRIDDEN)

When a caller wants to schedule an appointment:

1. Collect ALL of these details:
   - Customer name
   - Phone number (confirm the one they're calling from)
   - Vehicle: Year, Make, Model
   - What service they need or what's wrong
   - Preferred date and time
   - Whether they need a ride or loaner vehicle

2. CRITICAL WORDING — You MUST use this EXACT language:
   ✅ "I have submitted your appointment request for [day] at [time]."
   ✅ "You will receive a confirmation text shortly."
   ✅ "Our team will review your request and confirm via text."
   
   ❌ NEVER say "confirmed" or "you're all set" or "booked"
   ❌ NEVER say "your appointment is confirmed"
   ❌ NEVER say "I've booked you in"
   ❌ NEVER say "you're scheduled for"

3. After collecting all details, use the submit_appointment tool with all information.

4. If the caller asks "Is it confirmed?" — respond:
   "Our team reviews all appointment requests to make sure we have the right technician and time slot available. You'll get a confirmation text within a few minutes."

5. This is NOT a limitation — frame it as quality assurance:
   "We like to make sure we have the right specialist available for your vehicle, so our team will confirm your time slot and text you shortly."
`;

// ─── SMS Templates ─────────────────────────────────────────────────

/**
 * SMS sent to SHOP OWNER when a new appointment is requested.
 * Shop owner replies YES or NO to confirm/deny.
 */
export function buildShopNotificationSMS(req: AppointmentRequest): string {
  let msg = `📅 NEW APPOINTMENT REQUEST\n\n`;
  msg += `Customer: ${req.callerName}\n`;
  msg += `Phone: ${req.callerPhone}\n`;
  msg += `Vehicle: ${req.vehicle}\n`;
  msg += `Service: ${req.serviceRequested}\n`;
  msg += `Requested: ${req.requestedDate} at ${req.requestedTime}\n`;
  if (req.needsTransportation) {
    msg += `🚗 Needs ride/loaner\n`;
  }
  if (req.notes) {
    msg += `Notes: ${req.notes}\n`;
  }
  msg += `\nReply YES to confirm or NO to deny.`;
  return msg;
}

/**
 * SMS sent to CALLER when shop confirms the appointment.
 */
export function buildCallerConfirmationSMS(req: AppointmentRequest): string {
  return `✅ ${req.shopName} — Appointment Confirmed!\n\n` +
    `${req.requestedDate} at ${req.requestedTime}\n` +
    `Vehicle: ${req.vehicle}\n` +
    `Service: ${req.serviceRequested}\n` +
    (req.needsTransportation ? `🚗 Transportation arranged\n` : "") +
    `\nQuestions? Call us or reply to this text.`;
}

/**
 * SMS sent to CALLER when shop denies/needs to reschedule.
 */
export function buildCallerRescheduleSMS(
  req: AppointmentRequest,
  shopResponse?: string
): string {
  return `📞 ${req.shopName} — Scheduling Update\n\n` +
    `We need to adjust your appointment request for ${req.requestedDate} at ${req.requestedTime}.\n` +
    (shopResponse ? `Note from shop: ${shopResponse}\n` : "") +
    `\nPlease call us to find a time that works: ${req.shopOwnerPhone}`;
}

// ─── SMS Sending ───────────────────────────────────────────────────

/**
 * Send appointment request notification to shop owner via Twilio SMS.
 */
export async function notifyShopOfAppointment(
  req: AppointmentRequest,
  fromNumber: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const twilio = await import("twilio");
    const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);

    const message = await client.messages.create({
      body: buildShopNotificationSMS(req),
      from: fromNumber,
      to: req.shopOwnerPhone,
    });

    console.log(`[APPT] Sent appointment notification to shop owner ${req.shopOwnerPhone}: ${message.sid}`);

    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error(`[APPT] Failed to notify shop owner:`, error?.message || error);
    return { success: false, error: error?.message || "SMS send failed" };
  }
}

/**
 * Send confirmation SMS to caller after shop approves.
 */
export async function sendCallerConfirmation(
  req: AppointmentRequest,
  fromNumber: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const twilio = await import("twilio");
    const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);

    const message = await client.messages.create({
      body: buildCallerConfirmationSMS(req),
      from: fromNumber,
      to: req.callerPhone,
    });

    console.log(`[APPT] Sent confirmation to caller ${req.callerPhone}: ${message.sid}`);

    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error(`[APPT] Failed to send caller confirmation:`, error?.message || error);
    return { success: false, error: error?.message || "SMS send failed" };
  }
}

/**
 * Send reschedule SMS to caller after shop denies.
 */
export async function sendCallerReschedule(
  req: AppointmentRequest,
  fromNumber: string,
  shopResponse?: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const twilio = await import("twilio");
    const client = twilio.default(ENV.twilioAccountSid, ENV.twilioAuthToken);

    const message = await client.messages.create({
      body: buildCallerRescheduleSMS(req, shopResponse),
      from: fromNumber,
      to: req.callerPhone,
    });

    console.log(`[APPT] Sent reschedule notice to caller ${req.callerPhone}: ${message.sid}`);

    return { success: true, messageSid: message.sid };
  } catch (error: any) {
    console.error(`[APPT] Failed to send reschedule notice:`, error?.message || error);
    return { success: false, error: error?.message || "SMS send failed" };
  }
}
