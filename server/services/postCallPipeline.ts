/**
 * Post-Call Async Pipeline (Layer 2)
 *
 * Handles all post-call processing that must NOT block the live call:
 * - Transcription analysis (intent extraction, sentiment, QA flags)
 * - Call summary generation
 * - Usage metering
 * - Notification dispatch
 * - Missed call audit entry creation
 *
 * Architecture: Uses setImmediate/setTimeout for async processing.
 * In production, this would be replaced with a proper job queue
 * (Bull, BullMQ, or n8n webhooks).
 */
import { getDb } from "../db";
import { eq, and, sql } from "drizzle-orm";
import {
  callLogs,
  subscriptions,
  usageRecords,
  notifications,
  missedCallAudits,
  auditCallEntries,
  shops,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { createAppointment } from "./calendarService";
import { syncCallToSheet } from "./sheetsService";
import { syncCallerToHubspot } from "./hubspotService";
import { createWorkOrder } from "./shopmonkeyService";
import { sendSMS } from "./smsService";
import { callerProfiles } from "../../drizzle/schema";

/**
 * Analyze a call transcription using LLM.
 * Extracts: intent, service requested, sentiment, QA flags, summary.
 *
 * Uses structured JSON output for reliable parsing.
 */
export async function analyzeTranscription(
  transcription: string,
  shopName: string,
  serviceCatalog: string[]
): Promise<{
  customerIntent: string;
  serviceRequested: string;
  sentimentScore: number;
  qualityScore: number;
  qaFlags: string[];
  summary: string;
  appointmentBooked: boolean;
  appointmentDateTime: string | null;
  upsellAttempted: boolean;
  upsellAccepted: boolean;
  estimatedRevenue: number;
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a call analysis engine for ${shopName}, an auto repair shop. Analyze the following call transcription and extract structured data. The shop offers these services: ${serviceCatalog.join(", ")}.`,
        },
        {
          role: "user",
          content: `Analyze this call transcription:\n\n${transcription}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "call_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              customerIntent: {
                type: "string",
                description:
                  "Primary reason for the call (e.g., 'brake repair inquiry', 'oil change appointment', 'pricing question')",
              },
              serviceRequested: {
                type: "string",
                description:
                  "Specific service the customer is requesting, must match catalog if possible",
              },
              sentimentScore: {
                type: "number",
                description:
                  "Customer sentiment from 0.0 (very negative) to 1.0 (very positive)",
              },
              qualityScore: {
                type: "number",
                description:
                  "Call handling quality from 0.0 (poor) to 1.0 (excellent)",
              },
              qaFlags: {
                type: "array",
                items: { type: "string" },
                description:
                  "Quality assurance flags (e.g., 'customer_escalation_needed', 'pricing_discussed', 'competitor_mentioned', 'safety_concern')",
              },
              summary: {
                type: "string",
                description: "2-3 sentence summary of the call",
              },
              appointmentBooked: {
                type: "boolean",
                description: "Whether an appointment was successfully booked",
              },
              appointmentDateTime: {
                anyOf: [{ type: "string" }, { type: "null" }],
                description:
                  "ISO 8601 datetime of the scheduled appointment if booked (e.g. '2026-04-10T10:00:00'). Must be a valid ISO string or null if no specific time was mentioned.",
              },
              upsellAttempted: {
                type: "boolean",
                description: "Whether an additional service was suggested",
              },
              upsellAccepted: {
                type: "boolean",
                description: "Whether the customer accepted the upsell",
              },
              estimatedRevenue: {
                type: "number",
                description:
                  "Estimated revenue from this call in dollars (0 if no service booked)",
              },
            },
            required: [
              "customerIntent",
              "serviceRequested",
              "sentimentScore",
              "qualityScore",
              "qaFlags",
              "summary",
              "appointmentBooked",
              "appointmentDateTime",
              "upsellAttempted",
              "upsellAccepted",
              "estimatedRevenue",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error("No content in LLM response");
    }

    const content =
      typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    return JSON.parse(content);
  } catch (error) {
    console.error("[POST-CALL] Error analyzing transcription:", error);
    // Return safe defaults
    return {
      customerIntent: "unknown",
      serviceRequested: "unknown",
      sentimentScore: 0.5,
      qualityScore: 0.5,
      qaFlags: ["analysis_failed"],
      summary: "Call analysis failed. Manual review recommended.",
      appointmentBooked: false,
      appointmentDateTime: null,
      upsellAttempted: false,
      upsellAccepted: false,
      estimatedRevenue: 0,
    };
  }
}

/**
 * Process a completed call through the full async pipeline.
 *
 * Steps:
 * 1. Analyze transcription (if available)
 * 2. Update call log with analysis results
 * 3. Record usage for billing
 * 4. Send notifications for high-value leads
 * 5. Update missed call audit if applicable
 */
export async function processCompletedCall(callLogId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Fetch the call log
    const callResults = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.id, callLogId))
      .limit(1);

    if (callResults.length === 0) return;
    const call = callResults[0];

    // Step 1: Analyze transcription if available
    if (call.transcription) {
      // Get shop's service catalog for context
      const shopResults = await db
        .select()
        .from(shops)
        .where(eq(shops.id, call.shopId))
        .limit(1);

      const shop = shopResults[0];
      const catalog = (shop?.serviceCatalog || []).map((s) => s.name);

      const analysis = await analyzeTranscription(
        call.transcription,
        shop?.name || "Auto Repair Shop",
        catalog
      );

      // Step 2: Update call log with analysis
      await db
        .update(callLogs)
        .set({
          customerIntent: analysis.customerIntent,
          serviceRequested: analysis.serviceRequested,
          sentimentScore: analysis.sentimentScore.toFixed(2),
          qualityScore: analysis.qualityScore.toFixed(2),
          qaFlags: analysis.qaFlags,
          summary: analysis.summary,
          appointmentBooked: analysis.appointmentBooked,
          upsellAttempted: analysis.upsellAttempted,
          upsellAccepted: analysis.upsellAccepted,
          estimatedRevenue: analysis.estimatedRevenue.toFixed(2),
        })
        .where(eq(callLogs.id, callLogId));

      // Step 2b: Run post-call integrations (fire-and-forget)
      try {
        await runPostCallIntegrations(call.shopId, call, analysis);
      } catch (err) {
        console.error(
          "[POST-CALL] Integration pipeline error (non-fatal):",
          err
        );
      }
    }

    // Step 3: Record usage for billing
    const duration = call.duration || 0;
    const minutesUsed = Math.ceil(duration / 60);

    if (minutesUsed > 0) {
      // Find active subscription for this shop
      const subResults = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.shopId, call.shopId),
            eq(subscriptions.status, "active")
          )
        )
        .limit(1);

      if (subResults.length > 0) {
        const sub = subResults[0];
        const isOverage = sub.usedMinutes + minutesUsed > sub.includedMinutes;
        const overageMinutes = isOverage
          ? sub.usedMinutes + minutesUsed - sub.includedMinutes
          : 0;
        const overageCharge =
          overageMinutes * parseFloat(sub.overageRate?.toString() || "0.15");

        await db.insert(usageRecords).values({
          subscriptionId: sub.id,
          shopId: call.shopId,
          ownerId: call.ownerId,
          callLogId: callLogId,
          minutesUsed: minutesUsed.toFixed(2),
          isOverage,
          overageCharge: overageCharge.toFixed(2),
        });

        // Update subscription used minutes
        await db
          .update(subscriptions)
          .set({
            usedMinutes: sql`${subscriptions.usedMinutes} + ${minutesUsed}`,
          })
          .where(eq(subscriptions.id, sub.id));

        // Warn shop owner when approaching or exceeding minute allotment
        const newUsed = sub.usedMinutes + minutesUsed;
        const pct = newUsed / sub.includedMinutes;
        const prevPct = sub.usedMinutes / sub.includedMinutes;
        if (pct >= 1.0 && prevPct < 1.0) {
          // Just crossed 100% — overage charges begin
          await db.insert(notifications).values({
            userId: call.ownerId,
            shopId: call.shopId,
            type: "usage_alert",
            title: "AI Minutes Exhausted — Overage Active",
            message: `Your plan's ${sub.includedMinutes} included minutes have been used. Additional minutes are billed at $${parseFloat(sub.overageRate?.toString() || "0.15").toFixed(2)}/min.`,
            metadata: { usedMinutes: newUsed, includedMinutes: sub.includedMinutes },
          });
        } else if (pct >= 0.8 && prevPct < 0.8) {
          // Just crossed 80% — heads up
          await db.insert(notifications).values({
            userId: call.ownerId,
            shopId: call.shopId,
            type: "usage_alert",
            title: "80% of AI Minutes Used",
            message: `You've used ${newUsed} of your ${sub.includedMinutes} included minutes. Upgrade your plan to avoid overage charges.`,
            metadata: { usedMinutes: newUsed, includedMinutes: sub.includedMinutes },
          });
        }
      }
    }

    // Step 4: Send notification for high-value leads
    if (
      call.estimatedRevenue &&
      parseFloat(call.estimatedRevenue.toString()) > 200
    ) {
      await db.insert(notifications).values({
        userId: call.ownerId,
        shopId: call.shopId,
        type: "high_value_lead",
        title: "High-Value Lead Detected",
        message: `A caller inquired about services worth an estimated $${call.estimatedRevenue}. Review the call log for details.`,
        metadata: { callLogId, estimatedRevenue: call.estimatedRevenue },
      });
    }

    console.log(`[POST-CALL] Completed processing for call ${callLogId}`);
  } catch (error) {
    console.error(`[POST-CALL] Error processing call ${callLogId}:`, error);
  }
}

/**
 * Run post-call integrations after analysis is complete.
 * All integrations are fire-and-forget — failures don't affect the core pipeline.
 */
async function runPostCallIntegrations(
  shopId: number,
  callLog: any,
  analysis: {
    appointmentBooked: boolean;
    appointmentDateTime: string | null;
    serviceRequested: string;
    summary: string;
    upsellAttempted: boolean;
    upsellAccepted: boolean;
    estimatedRevenue: number;
  }
): Promise<void> {
  // Google Calendar: create appointment only when we have a valid extracted datetime
  if (analysis.appointmentBooked && analysis.appointmentDateTime) {
    const parsedDate = new Date(analysis.appointmentDateTime);
    if (!isNaN(parsedDate.getTime())) {
      try {
        await createAppointment(shopId, {
          customerName: callLog.callerName || "Customer",
          customerPhone: callLog.callerPhone || "",
          service: analysis.serviceRequested,
          dateTime: parsedDate.toISOString(),
          notes: analysis.summary,
        });
      } catch (err) {
        console.error("[POST-CALL] Calendar integration error:", err);
      }
    } else {
      console.warn(
        `[POST-CALL] appointmentDateTime "${analysis.appointmentDateTime}" is not a valid ISO string — skipping calendar creation`
      );
    }
  } else if (analysis.appointmentBooked) {
    console.log(
      "[POST-CALL] Appointment booked but no specific datetime extracted — skipping calendar creation"
    );
  }

  // Google Sheets: sync call data
  try {
    await syncCallToSheet(shopId, callLog);
  } catch (err) {
    console.error("[POST-CALL] Sheets integration error:", err);
  }

  // HubSpot: sync caller as contact
  try {
    await syncCallerToHubspot(shopId, {
      phone: callLog.callerPhone || "",
      name: callLog.callerName || undefined,
      service: analysis.serviceRequested,
      callSummary: analysis.summary,
      duration: callLog.duration,
      recordingUrl: callLog.recordingUrl,
    });
  } catch (err) {
    console.error("[POST-CALL] HubSpot integration error:", err);
  }

  // Shopmonkey: create work order if appointment booked
  if (analysis.appointmentBooked) {
    try {
      await createWorkOrder(shopId, {
        customerName: callLog.callerName || "Customer",
        customerPhone: callLog.callerPhone || "",
        service: analysis.serviceRequested,
        notes: analysis.summary,
      });
    } catch (err) {
      console.error("[POST-CALL] Shopmonkey integration error:", err);
    }
  }

  // SMS follow-up to the caller
  try {
    const db = await getDb();
    if (db && callLog.callerPhone) {
      // Check opt-out
      const profile = await db
        .select({
          smsOptOut: callerProfiles.smsOptOut,
          doNotSell: callerProfiles.doNotSell,
        })
        .from(callerProfiles)
        .where(eq(callerProfiles.phone, callLog.callerPhone))
        .limit(1);

      const optedOut = profile[0]?.smsOptOut || profile[0]?.doNotSell;

      // Check shop SMS setting
      const shopResult = await db
        .select({
          smsFollowUpEnabled: shops.smsFollowUpEnabled,
          name: shops.name,
          phone: shops.phone,
        })
        .from(shops)
        .where(eq(shops.id, shopId))
        .limit(1);

      const shop = shopResult[0];

      if (!optedOut && shop?.smsFollowUpEnabled) {
        const smsBody = analysis.appointmentBooked
          ? `Hi! Your appointment for ${analysis.serviceRequested} at ${shop.name} has been noted. We'll confirm the details shortly. Reply STOP to opt out.`
          : `Thanks for calling ${shop.name}! If you need anything, call us at ${shop.phone || "our shop"}. Reply STOP to opt out.`;

        await sendSMS({ to: callLog.callerPhone, body: smsBody });
      }
    }
  } catch (err) {
    console.error("[POST-CALL] SMS follow-up error:", err);
  }
}

/**
 * Process a missed call — log it and update any active audit.
 */
export async function processMissedCall(
  shopId: number,
  ownerId: number,
  callerPhone: string,
  callTimestamp: Date
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    // Check if there's an active audit for this shop
    const auditResults = await db
      .select()
      .from(missedCallAudits)
      .where(
        and(
          eq(missedCallAudits.shopId, shopId),
          eq(missedCallAudits.status, "active")
        )
      )
      .limit(1);

    if (auditResults.length > 0) {
      const audit = auditResults[0];

      // Determine day part
      const hour = callTimestamp.getHours();
      let dayPart: "morning" | "afternoon" | "evening" | "night";
      if (hour >= 6 && hour < 12) dayPart = "morning";
      else if (hour >= 12 && hour < 17) dayPart = "afternoon";
      else if (hour >= 17 && hour < 21) dayPart = "evening";
      else dayPart = "night";

      // Create audit call entry
      await db.insert(auditCallEntries).values({
        auditId: audit.id,
        callerPhone,
        callTimestamp,
        dayPart,
        urgencyLevel: "medium", // Default, will be updated by analysis
      });

      // Increment missed call count
      await db
        .update(missedCallAudits)
        .set({ totalMissedCalls: (audit.totalMissedCalls || 0) + 1 })
        .where(eq(missedCallAudits.id, audit.id));
    }

    // Send notification
    await db.insert(notifications).values({
      userId: ownerId,
      shopId,
      type: "missed_call",
      title: "Missed Call",
      message: `A call from ${callerPhone} was missed. The caller may try again or go to a competitor.`,
      metadata: { callerPhone, timestamp: callTimestamp.toISOString() },
    });
  } catch (error) {
    console.error("[POST-CALL] Error processing missed call:", error);
  }
}
