/**
 * Twilio Webhook Routes & ElevenLabs Bridge
 * 
 * Layer 1: Real-Time Call Path
 * 
 * Flow: Inbound Twilio Call → Tenant Resolver → Hot Context Cache → 
 *       ElevenLabs Register Call API → TwiML Response
 * 
 * Critical constraints:
 * - NO database writes during live call
 * - NO heavy processing during live call
 * - Sub-2-second response time for TwiML
 * - Graceful fallback to voicemail if ElevenLabs fails
 * 
 * The Register Call API authenticates with ElevenLabs server-side,
 * then returns TwiML with an authenticated WebSocket URL.
 * This is the correct integration pattern per ElevenLabs docs.
 */
import { Router, Request, Response } from "express";
import { contextCache } from "./contextCache";
import { compileSystemPrompt, compileGreeting, type ShopContext } from "./promptCompiler";
import { processCompletedCall, processMissedCall } from "./postCallPipeline";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import { shops, agentConfigs } from "../../drizzle/schema";
import { ENV } from "../_core/env";

/** Timeout for ElevenLabs Register Call API — prevents dead air on slow responses */
const ELEVENLABS_TIMEOUT_MS = 8000;

const twilioRouter = Router();

/**
 * Generate TwiML for voicemail fallback.
 * Used when ElevenLabs is unavailable or the call can't be routed.
 */
function generateVoicemailTwiML(shopName: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you for calling ${escapeXml(shopName)}. 
    We're sorry, but our AI assistant is temporarily unavailable. 
    Please leave a message after the beep with your name, phone number, 
    and a brief description of what you need, and we'll get back to you 
    as soon as possible.
  </Say>
  <Record 
    maxLength="120" 
    action="/api/twilio/recording-complete" 
    transcribe="true" 
    transcribeCallback="/api/twilio/transcription-complete"
  />
  <Say voice="Polly.Joanna">We didn't receive a recording. Goodbye.</Say>
</Response>`;
}

/**
 * Generate TwiML for after-hours calls.
 */
function generateAfterHoursTwiML(shopName: string, openTime: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you for calling ${escapeXml(shopName)}. 
    We are currently closed. Our next available time is ${escapeXml(openTime)}. 
    Please leave a message after the beep and we'll return your call.
  </Say>
  <Record 
    maxLength="120" 
    action="/api/twilio/recording-complete" 
    transcribe="true" 
    transcribeCallback="/api/twilio/transcription-complete"
  />
  <Say voice="Polly.Joanna">We didn't receive a recording. Goodbye.</Say>
</Response>`;
}

/**
 * Register a call with ElevenLabs and get authenticated TwiML.
 * 
 * This calls the ElevenLabs Register Call API which:
 * 1. Authenticates using our API key (server-side, never exposed)
 * 2. Creates a conversation session
 * 3. Returns TwiML with an authenticated WebSocket URL
 * 
 * This is the correct approach per ElevenLabs docs:
 * https://elevenlabs.io/docs/eleven-agents/phone-numbers/twilio-integration/register-call
 */
async function registerElevenLabsCall(
  elevenLabsAgentId: string,
  fromNumber: string,
  toNumber: string,
  shopContext?: ShopContext
): Promise<string> {
  // P0 FIX: AbortController timeout prevents dead air if ElevenLabs is slow
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS_TIMEOUT_MS);

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "xi-api-key": ENV.elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: elevenLabsAgentId,
          from_number: fromNumber,
          to_number: toNumber,
          direction: "inbound",
          conversation_initiation_client_data: {
            dynamic_variables: {
              caller_number: fromNumber,
              shop_name: shopContext?.shopName || "Auto Repair Shop",
              agent_name: shopContext?.agentName || "Baylio",
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `ElevenLabs Register Call failed (${response.status}): ${errorText}`
      );
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Escape XML special characters for TwiML.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Resolve shop context from phone number.
 * First checks cache, then falls back to database.
 * Caches the result for subsequent calls.
 */
async function resolveShopContext(
  calledNumber: string
): Promise<{ shopId: number; context: ShopContext; elevenLabsAgentId: string } | null> {
  // Step 1: Check phone → shopId cache
  let shopId = contextCache.getShopIdByPhone(calledNumber);

  if (shopId === null) {
    // Cache miss — query database
    const db = await getDb();
    if (!db) return null;

    const results = await db
      .select()
      .from(shops)
      .where(eq(shops.twilioPhoneNumber, calledNumber))
      .limit(1);

    if (results.length === 0) return null;

    shopId = results[0].id;
    contextCache.setPhoneToShopId(calledNumber, shopId);
  }

  // Step 2: Check shop context cache
  let context = contextCache.getShopContext(shopId);
  let elevenLabsAgentId = "";

  if (!context) {
    // Cache miss — build context from database
    const db = await getDb();
    if (!db) return null;

    const shopResults = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1);

    if (shopResults.length === 0) return null;

    const shop = shopResults[0];

    const agentResults = await db
      .select()
      .from(agentConfigs)
      .where(eq(agentConfigs.shopId, shopId))
      .limit(1);

    const agent = agentResults[0];
    elevenLabsAgentId = agent?.elevenLabsAgentId || "";

    context = {
      shopName: shop.name,
      agentName: agent?.agentName || "Baylio",
      phone: shop.phone || "",
      address: shop.address || "",
      city: shop.city || "",
      state: shop.state || "",
      timezone: shop.timezone || "America/New_York",
      businessHours: (shop.businessHours as any) || {},
      serviceCatalog: (shop.serviceCatalog as any) || [],
      upsellRules: (agent?.upsellRules as any) || [],
      confidenceThreshold: parseFloat(agent?.confidenceThreshold?.toString() || "0.80"),
      maxUpsellsPerCall: agent?.maxUpsellsPerCall || 1,
      greeting: agent?.greeting || "",
      language: agent?.language || "en",
      customSystemPrompt: agent?.systemPrompt || undefined,
    };

    contextCache.setShopContext(shopId, context);
  }

  // Get elevenLabsAgentId from cache or DB
  if (!elevenLabsAgentId) {
    const db = await getDb();
    if (db) {
      const agentResults = await db
        .select({ elevenLabsAgentId: agentConfigs.elevenLabsAgentId })
        .from(agentConfigs)
        .where(eq(agentConfigs.shopId, shopId))
        .limit(1);
      elevenLabsAgentId = agentResults[0]?.elevenLabsAgentId || "";
    }
  }

  return { shopId, context, elevenLabsAgentId };
}

// ─── Webhook Endpoints ──────────────────────────────────────────────

/**
 * POST /api/twilio/voice
 * 
 * Main inbound call webhook. Twilio hits this when a call comes in.
 * Must respond with TwiML in <2 seconds.
 */
twilioRouter.post("/voice", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { To, From, CallSid, CallStatus } = req.body;

    console.log(`[CALL] Inbound call: ${From} → ${To} (SID: ${CallSid})`);

    // Step 1: Resolve shop context from the called number
    const resolved = await resolveShopContext(To);

    if (!resolved) {
      console.warn(`[CALL] No shop found for number: ${To}`);
      res.type("text/xml");
      return res.send(generateVoicemailTwiML("this business"));
    }

    const { shopId, context, elevenLabsAgentId } = resolved;

    // Step 2: Check if ElevenLabs agent is configured
    if (!elevenLabsAgentId) {
      console.warn(`[CALL] No ElevenLabs agent configured for shop ${shopId}`);
      res.type("text/xml");
      return res.send(generateVoicemailTwiML(context.shopName));
    }

    // Step 3: Register call with ElevenLabs (authenticated server-side)
    console.log(`[CALL] Registering call with ElevenLabs agent ${elevenLabsAgentId} for shop ${shopId}...`);

    const twiml = await registerElevenLabsCall(
      elevenLabsAgentId,
      From,
      To,
      context
    );

    console.log(`[CALL] ElevenLabs registered OK for shop ${shopId} (${Date.now() - startTime}ms)`);

    res.type("text/xml");
    return res.send(twiml);
  } catch (error) {
    console.error("[CALL] Error handling inbound call:", error);
    // CRITICAL: Always return valid TwiML, never let the call drop
    res.type("text/xml");
    return res.send(generateVoicemailTwiML("this business"));
  }
});

/**
 * POST /api/twilio/status
 * 
 * Call status callback. Twilio sends updates as the call progresses.
 * This is Layer 2 — async processing, can be slower.
 */
twilioRouter.post("/status", async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration, To, From, RecordingUrl } = req.body;

    console.log(`[CALL-STATUS] ${CallSid}: ${CallStatus} (duration: ${CallDuration}s)`);

    // Queue async processing — do NOT block the response
    // In production, this would go to a job queue (Bull, BullMQ, etc.)
    setImmediate(async () => {
      try {
        const db = await getDb();
        if (!db) return;

        const { callLogs } = await import("../../drizzle/schema");

        if (CallStatus === "completed" || CallStatus === "no-answer" || CallStatus === "busy" || CallStatus === "failed") {
          // Look up shop by phone number
          const shopResult = await db
            .select({ id: shops.id, ownerId: shops.ownerId })
            .from(shops)
            .where(eq(shops.twilioPhoneNumber, To))
            .limit(1);

          if (shopResult.length > 0) {
            const shop = shopResult[0];

            // P1 FIX: Use call start/end timestamps derived from duration
            // Twilio sends CallDuration at call end; back-calculate start time
            const callEndedAt = new Date();
            const durationSecs = parseInt(CallDuration) || 0;
            const callStartedAt = new Date(callEndedAt.getTime() - durationSecs * 1000);

            await db.insert(callLogs).values({
              shopId: shop.id,
              ownerId: shop.ownerId,
              twilioCallSid: CallSid,
              callerPhone: From,
              direction: "inbound",
              status: CallStatus === "completed" ? "completed" : "missed",
              duration: durationSecs,
              recordingUrl: RecordingUrl || null,
              callStartedAt,
              callEndedAt,
            });

            // P0 FIX: Wire processCompletedCall so post-call pipeline actually runs
            if (CallStatus === "completed") {
              // Get the inserted call log ID
              const newLog = await db
                .select({ id: callLogs.id })
                .from(callLogs)
                .where(eq(callLogs.twilioCallSid, CallSid))
                .limit(1);

              if (newLog.length > 0) {
                // Run post-call pipeline async — transcription, analysis, billing, notifications
                setImmediate(() => processCompletedCall(newLog[0].id));
              }
            } else {
              // P0 FIX: Wire processMissedCall for missed/busy/no-answer calls
              setImmediate(() =>
                processMissedCall(shop.id, shop.ownerId, From, callEndedAt)
              );
            }
          }
        }
      } catch (err) {
        console.error("[CALL-STATUS] Error logging call:", err);
      }
    });

    // Always respond 200 quickly
    res.status(200).send("OK");
  } catch (error) {
    console.error("[CALL-STATUS] Error:", error);
    res.status(200).send("OK"); // Always 200 to Twilio
  }
});

/**
 * POST /api/twilio/recording-complete
 * 
 * Called when a voicemail recording is complete.
 * Layer 2 — async processing.
 */
twilioRouter.post("/recording-complete", async (req: Request, res: Response) => {
  try {
    const { CallSid, RecordingUrl, RecordingDuration } = req.body;

    console.log(`[RECORDING] Recording complete for ${CallSid}: ${RecordingUrl} (${RecordingDuration}s)`);

    // Queue for async transcription and analysis
    setImmediate(async () => {
      try {
        const db = await getDb();
        if (!db) return;

        const { callLogs } = await import("../../drizzle/schema");

        // Update the call log with recording URL
        await db
          .update(callLogs)
          .set({ recordingUrl: RecordingUrl })
          .where(eq(callLogs.twilioCallSid, CallSid));
      } catch (err) {
        console.error("[RECORDING] Error updating call log:", err);
      }
    });

    res.type("text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  } catch (error) {
    console.error("[RECORDING] Error:", error);
    res.type("text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
});

/**
 * POST /api/twilio/transcription-complete
 * 
 * Called when Twilio finishes transcribing a voicemail.
 * Layer 2 — async processing.
 */
twilioRouter.post("/transcription-complete", async (req: Request, res: Response) => {
  try {
    const { CallSid, TranscriptionText, TranscriptionStatus } = req.body;

    console.log(`[TRANSCRIPTION] ${CallSid}: ${TranscriptionStatus}`);

    if (TranscriptionStatus === "completed" && TranscriptionText) {
      setImmediate(async () => {
        try {
          const db = await getDb();
          if (!db) return;

          const { callLogs } = await import("../../drizzle/schema");

          await db
            .update(callLogs)
            .set({ transcription: TranscriptionText })
            .where(eq(callLogs.twilioCallSid, CallSid));
        } catch (err) {
          console.error("[TRANSCRIPTION] Error updating call log:", err);
        }
      });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("[TRANSCRIPTION] Error:", error);
    res.status(200).send("OK");
  }
});

/**
 * GET /api/twilio/health
 * 
 * Health check endpoint for monitoring.
 */
twilioRouter.get("/health", (_req: Request, res: Response) => {
  const cacheStats = contextCache.getStats();
  res.json({
    status: "ok",
    service: "baylio-twilio-bridge",
    cache: cacheStats,
    timestamp: new Date().toISOString(),
  });
});

export { twilioRouter };
