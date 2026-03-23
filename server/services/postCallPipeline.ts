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
import { callLogs, subscriptions, usageRecords, notifications, missedCallAudits, auditCallEntries, shops } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { extractAndSaveMemory } from "./callerMemoryService";
import { extractFollowUpIntent, scheduleFollowUpCall } from "./followUpScheduler";

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
                description: "Primary reason for the call (e.g., 'brake repair inquiry', 'oil change appointment', 'pricing question')",
              },
              serviceRequested: {
                type: "string",
                description: "Specific service the customer is requesting, must match catalog if possible",
              },
              sentimentScore: {
                type: "number",
                description: "Customer sentiment from 0.0 (very negative) to 1.0 (very positive)",
              },
              qualityScore: {
                type: "number",
                description: "Call handling quality from 0.0 (poor) to 1.0 (excellent)",
              },
              qaFlags: {
                type: "array",
                items: { type: "string" },
                description: "Quality assurance flags (e.g., 'customer_escalation_needed', 'pricing_discussed', 'competitor_mentioned', 'safety_concern')",
              },
              summary: {
                type: "string",
                description: "2-3 sentence summary of the call",
              },
              appointmentBooked: {
                type: "boolean",
                description: "Whether an appointment was successfully booked",
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
                description: "Estimated revenue from this call in dollars (0 if no service booked)",
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

    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
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
    let analysisRevenue = 0;
    if (call.transcription) {
      // Get shop's service catalog for context
      const shopResults = await db
        .select()
        .from(shops)
        .where(eq(shops.id, call.shopId))
        .limit(1);

      const shop = shopResults[0];
      const rawCatalog = (shop?.serviceCatalog ?? []) as Array<{ name: string; category: string; price?: number; description?: string }>;
      const catalog = rawCatalog.map((s) => s.name);

      const analysis = await analyzeTranscription(
        call.transcription,
        shop?.name || "Auto Repair Shop",
        catalog
      );

      analysisRevenue = analysis.estimatedRevenue;

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
        const overageCharge = overageMinutes * parseFloat(sub.overageRate?.toString() || "0.15");

        await db.insert(usageRecords).values({
          subscriptionId: sub.id,
          shopId: call.shopId,
          ownerId: call.ownerId,
          callLogId: callLogId,
          minutesUsed: minutesUsed.toFixed(2),
          isOverage,
          overageCharge: overageCharge.toFixed(2),
        });

        // P0 FIX: Atomic SQL increment prevents race condition on concurrent calls
        // Non-atomic read-modify-write would under-bill if two calls complete simultaneously
        await db
          .update(subscriptions)
          .set({ usedMinutes: sql`${subscriptions.usedMinutes} + ${minutesUsed}` })
          .where(eq(subscriptions.id, sub.id));
      }
    }

    // Step 4: Send notification for high-value leads
    // Use analysis result directly instead of re-querying the DB
    if (analysisRevenue > 200) {
      await db.insert(notifications).values({
        userId: call.ownerId,
        shopId: call.shopId,
        type: "high_value_lead",
        title: "High-Value Lead Detected",
        message: `A caller inquired about services worth an estimated $${analysisRevenue.toFixed(2)}. Review the call log for details.`,
        metadata: { callLogId, estimatedRevenue: analysisRevenue },
      });
    }

    // Step 5: Extract and save caller memory from transcript (sales line calls)
    // This enables the AI to remember the caller by name/role/shop on future calls.
    if (call.transcription && call.callerPhone) {
      const callSid = (call as { callSid?: string }).callSid || "";
      // Run memory extraction non-blocking — don't let it delay other steps
      extractAndSaveMemory(call.callerPhone, call.transcription, callSid).catch((err) =>
        console.error(`[POST-CALL] Memory extraction failed for call ${callLogId}:`, err)
      );

      // Step 6: Extract follow-up scheduling intent ("call me back in 2 hours", "talk next week")
      // If the caller asked for a callback, schedule it automatically.
      extractFollowUpIntent(call.transcription, call.callerPhone)
        .then(async (intent) => {
          if (intent.hasFollowUp) {
            console.log(`[POST-CALL] Follow-up intent detected for ${call.callerPhone}: ${intent.reason}`);
            await scheduleFollowUpCall(call.callerPhone ?? "", intent);
          }
        })
        .catch((err) =>
          console.error(`[POST-CALL] Follow-up extraction failed for call ${callLogId}:`, err)
        );
    }

    console.log(`[POST-CALL] Completed processing for call ${callLogId}`);
  } catch (error) {
    console.error(`[POST-CALL] Error processing call ${callLogId}:`, error);
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
