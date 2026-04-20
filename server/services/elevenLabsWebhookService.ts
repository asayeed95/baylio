/**
 * ElevenLabs Post-Call Webhook Handler
 *
 * Receives the post_call_transcription event from ElevenLabs when a Sam
 * conversation ends. Handles:
 *   1. Mem0 memory storage (caller history for Sam)
 *   2. Per-shop minute tracking using ElevenLabs-exact call_duration_secs
 *      (more accurate than Twilio CallDuration which includes webhook latency)
 *
 * Configure Sam's ElevenLabs agent to POST to:
 *   https://baylio.io/api/elevenlabs/conversation
 *
 * Run scripts/setup-sam-mem0.mjs once to wire this up.
 */
import { Router, Request, Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { storeCallMemory } from "./mem0Service";
import { getDb } from "../db";
import { subscriptions, usageRecords, notifications } from "../../drizzle/schema";

export const elevenLabsWebhookRouter = Router();

interface ElevenLabsTranscriptTurn {
  role: "agent" | "user";
  message: string;
  time_in_call_secs?: number;
}

interface ElevenLabsWebhookPayload {
  type: string;
  data?: {
    agent_id?: string;
    conversation_id?: string;
    status?: string;
    metadata?: {
      call_duration_secs?: number;
      cost?: number;
    };
    transcript?: ElevenLabsTranscriptTurn[];
    conversation_initiation_client_data?: {
      dynamic_variables?: Record<string, string>;
    };
  };
}

/**
 * POST /api/elevenlabs/conversation
 *
 * ElevenLabs fires this when a conversation ends with the full transcript.
 * We extract caller_phone from the dynamic_variables we passed at call start.
 * For shop agents we also record usage against the shop's subscription using
 * ElevenLabs-exact call_duration_secs (the actual billing duration).
 */
elevenLabsWebhookRouter.post(
  "/conversation",
  async (req: Request, res: Response) => {
    // Respond immediately — all processing is fire-and-forget
    res.status(200).send("OK");

    try {
      const payload = req.body as ElevenLabsWebhookPayload;

      if (payload.type !== "post_call_transcription") return;

      const data = payload.data;
      if (!data) return;

      const dynVars = data.conversation_initiation_client_data?.dynamic_variables ?? {};
      const callerPhone = dynVars.caller_phone;
      const shopIdStr = dynVars.shop_id;
      const callDurationSecs = data.metadata?.call_duration_secs;

      // ── 1. Mem0 memory storage (Sam calls only — shop agents don't use Mem0) ──
      if (callerPhone) {
        const transcript = data.transcript;
        if (transcript?.length) {
          const messages: Array<{ role: "user" | "assistant"; content: string }> =
            transcript
              .filter((t) => t.message?.trim())
              .map((t) => ({
                role: t.role === "user" ? "user" : "assistant",
                content: t.message.trim(),
              }));
          await storeCallMemory(callerPhone, messages);
          console.log(
            `[ELEVENLABS-WEBHOOK] Stored memory for ${callerPhone} — conv ${data.conversation_id}`
          );
        }
      }

      // ── 2. Per-shop usage tracking (shop agent calls only) ──
      // Twilio's /status webhook already increments usedMinutes via processCompletedCall,
      // but it uses Twilio CallDuration which includes webhook processing latency (~3-5s).
      // ElevenLabs call_duration_secs is the exact billing duration — use it to correct
      // the usage record created by postCallPipeline.
      if (!shopIdStr || !callDurationSecs) return;

      const shopId = parseInt(shopIdStr, 10);
      if (isNaN(shopId)) return;

      const minutesUsed = Math.ceil(callDurationSecs / 60);
      if (minutesUsed <= 0) return;

      const db = await getDb();
      if (!db) return;

      const subResults = await db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.shopId, shopId), eq(subscriptions.status, "active")))
        .limit(1);

      if (!subResults.length) return;
      const sub = subResults[0];

      // The Twilio pipeline already recorded usage via processCompletedCall.
      // We overwrite usedMinutes with ElevenLabs-exact accounting by computing
      // the delta: ElevenLabs minutes - ceil(twilio minutes) ≈ 0 or -1.
      // To avoid double-counting, we update the most-recent usage record for
      // this shop rather than inserting a new one.
      const recentUsage = await db
        .select()
        .from(usageRecords)
        .where(eq(usageRecords.shopId, shopId))
        .orderBy(sql`${usageRecords.recordedAt} DESC`)
        .limit(1);

      if (recentUsage.length > 0) {
        const prev = recentUsage[0];
        const prevMinutes = parseFloat(prev.minutesUsed?.toString() ?? "0");
        const delta = minutesUsed - prevMinutes;

        if (delta !== 0) {
          // Correct the subscription total and the usage record
          await db
            .update(usageRecords)
            .set({ minutesUsed: minutesUsed.toFixed(2) })
            .where(eq(usageRecords.id, prev.id));

          await db
            .update(subscriptions)
            .set({ usedMinutes: sql`${subscriptions.usedMinutes} + ${delta}` })
            .where(eq(subscriptions.id, sub.id));

          console.log(
            `[ELEVENLABS-WEBHOOK] Corrected usage for shop ${shopId}: ${prevMinutes} → ${minutesUsed} min (delta ${delta > 0 ? "+" : ""}${delta})`
          );
        }
      }

      // ── 3. Threshold warnings (80% / 100%) ──
      // These may have already fired from postCallPipeline, but that pipeline
      // uses Twilio duration. Re-check here with ElevenLabs-exact totals so
      // the threshold is accurate.
      const newUsed = sub.usedMinutes + minutesUsed;
      const pct = newUsed / sub.includedMinutes;
      const prevPct = sub.usedMinutes / sub.includedMinutes;

      if (pct >= 1.0 && prevPct < 1.0) {
        await db.insert(notifications).values({
          userId: sub.ownerId,
          shopId: sub.shopId,
          type: "usage_alert",
          title: "AI Minutes Exhausted — Overage Active",
          message: `Your plan's ${sub.includedMinutes} included minutes have been used. Additional minutes are billed at $${parseFloat(sub.overageRate?.toString() ?? "0.15").toFixed(2)}/min.`,
          metadata: { usedMinutes: newUsed, includedMinutes: sub.includedMinutes },
        });
      } else if (pct >= 0.8 && prevPct < 0.8) {
        await db.insert(notifications).values({
          userId: sub.ownerId,
          shopId: sub.shopId,
          type: "usage_alert",
          title: "80% of AI Minutes Used",
          message: `You've used ${newUsed} of your ${sub.includedMinutes} included minutes this period. Upgrade to avoid overage charges.`,
          metadata: { usedMinutes: newUsed, includedMinutes: sub.includedMinutes },
        });
      }
    } catch (err) {
      console.error("[ELEVENLABS-WEBHOOK] Error processing webhook:", err);
    }
  }
);
