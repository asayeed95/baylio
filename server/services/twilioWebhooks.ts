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
import { baylioSalesAgentPrompt, baylioSalesFirstMessage } from "./prompts/baylioSalesAgent";

/** Timeout for ElevenLabs Register Call API — prevents dead air on slow responses */
const ELEVENLABS_TIMEOUT_MS = 8000;

const twilioRouter = Router();

// ─── Types ─────────────────────────────────────────────────────────

/**
 * conversation_config_override structure for ElevenLabs Register Call API.
 * Allows per-call customization of system prompt, first message, voice, etc.
 * 
 * IMPORTANT: Overrides must be enabled in the ElevenLabs dashboard
 * under Agent Settings → Security tab for each field you want to override.
 */
interface ConversationConfigOverride {
  agent?: {
    prompt?: {
      prompt?: string;  // System prompt override
      llm?: string;     // LLM model override (e.g., "gpt-4o")
    };
    first_message?: string;
    language?: string;
  };
  tts?: {
    voice_id?: string;
    stability?: number;    // 0.0 to 1.0
    speed?: number;        // 0.7 to 1.2
    similarity_boost?: number; // 0.0 to 1.0
  };
}

// ─── TwiML Generators ──────────────────────────────────────────────

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

// ─── ElevenLabs Register Call ──────────────────────────────────────

/**
 * Register a call with ElevenLabs and get authenticated TwiML.
 * 
 * This calls the ElevenLabs Register Call API which:
 * 1. Authenticates using our API key (server-side, never exposed)
 * 2. Creates a conversation session
 * 3. Returns TwiML with an authenticated WebSocket URL
 * 
 * NOW SUPPORTS conversation_config_override:
 * - Pass a compiled system prompt per call (shop-specific or sales agent)
 * - Override first message, voice, language per call
 * - Eliminates dependency on generic dashboard prompt
 * 
 * @see https://elevenlabs.io/docs/api-reference/twilio/register-call
 * @see https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides
 */
async function registerElevenLabsCall(
  elevenLabsAgentId: string,
  fromNumber: string,
  toNumber: string,
  options?: {
    shopContext?: ShopContext;
    configOverride?: ConversationConfigOverride;
    dynamicVariables?: Record<string, string>;
  }
): Promise<string> {
  // P0 FIX: AbortController timeout prevents dead air if ElevenLabs is slow
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS_TIMEOUT_MS);

  try {
    // Build the request body
    const body: Record<string, unknown> = {
      agent_id: elevenLabsAgentId,
      from_number: fromNumber,
      to_number: toNumber,
      direction: "inbound",
    };

    // Build conversation_initiation_client_data with overrides
    const clientData: Record<string, unknown> = {};

    // Add conversation_config_override if provided
    if (options?.configOverride) {
      clientData.conversation_config_override = options.configOverride;
    }

    // Add dynamic variables (always include caller context)
    clientData.dynamic_variables = {
      caller_number: fromNumber,
      ...(options?.shopContext ? {
        shop_name: options.shopContext.shopName,
        agent_name: options.shopContext.agentName,
      } : {}),
      ...(options?.dynamicVariables || {}),
    };

    body.conversation_initiation_client_data = clientData;

    console.log(`[CALL] Registering with ElevenLabs agent ${elevenLabsAgentId}, override: ${!!options?.configOverride}`);

    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "xi-api-key": ENV.elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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

// ─── Routing Logic ─────────────────────────────────────────────────

/**
 * Check if the called number is the Baylio corporate sales line.
 * The sales line uses a special prompt (baylioSalesAgentPrompt)
 * instead of a shop-specific prompt.
 */
function isBaylioSalesLine(toNumber: string): boolean {
  // Normalize both numbers for comparison (strip non-digits, add +1 prefix)
  const normalize = (n: string) => {
    const digits = n.replace(/\D/g, "");
    return digits.length === 10 ? `+1${digits}` : `+${digits}`;
  };

  const salesPhone = ENV.baylioSalesPhone || "+18448752441";
  return normalize(toNumber) === normalize(salesPhone);
}

/**
 * Handle the Baylio sales line call.
 * Uses the baylioSalesAgentPrompt and the corporate ElevenLabs agent.
 */
async function handleSalesLineCall(
  fromNumber: string,
  toNumber: string
): Promise<string> {
  const agentId = ENV.elevenLabsAgentId;

  if (!agentId) {
    console.error("[SALES] No ELEVENLABS_AGENT_ID configured for sales line");
    return generateVoicemailTwiML("Baylio");
  }

  console.log(`[SALES] Routing to Baylio Sales Agent (${agentId})`);

  return registerElevenLabsCall(agentId, fromNumber, toNumber, {
    configOverride: {
      agent: {
        prompt: {
          prompt: baylioSalesAgentPrompt,
        },
        first_message: baylioSalesFirstMessage,
        language: "en",
      },
    },
    dynamicVariables: {
      caller_number: fromNumber,
      call_type: "sales_inquiry",
    },
  });
}

// ─── Shop Context Resolution ──────────────────────────────────────

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
      voiceId: agent?.voiceId || undefined,
      voiceName: agent?.voiceName || undefined,
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

/**
 * Handle a shop-specific call with compiled system prompt override.
 * Compiles the shop's context into a full system prompt and passes it
 * via conversation_config_override so each call gets the right persona.
 */
async function handleShopCall(
  fromNumber: string,
  toNumber: string,
  shopId: number,
  context: ShopContext,
  elevenLabsAgentId: string
): Promise<string> {
  // Compile the shop-specific system prompt
  const compiledPrompt = compileSystemPrompt(context);
  const greeting = compileGreeting(context);

  console.log(`[CALL] Compiled prompt for shop ${shopId} (${context.shopName}), tokens ~${Math.ceil(compiledPrompt.length / 4)}`);

  // Build the config override with optional voice
  const configOverride: ConversationConfigOverride = {
    agent: {
      prompt: {
        prompt: compiledPrompt,
      },
      first_message: greeting,
      language: context.language || "en",
    },
  };

  // Add voice override if the shop has a custom voice configured
  if (context.voiceId) {
    configOverride.tts = {
      voice_id: context.voiceId,
    };
    console.log(`[CALL] Using custom voice for shop ${shopId}: ${context.voiceName || context.voiceId}`);
  }

  return registerElevenLabsCall(elevenLabsAgentId, fromNumber, toNumber, {
    shopContext: context,
    configOverride,
    dynamicVariables: {
      caller_number: fromNumber,
      shop_name: context.shopName,
      agent_name: context.agentName,
      call_type: "shop_inbound",
    },
  });
}

// ─── Webhook Endpoints ──────────────────────────────────────────────

/**
 * POST /api/twilio/voice
 * 
 * Main inbound call webhook. Twilio hits this when a call comes in.
 * Must respond with TwiML in <2 seconds.
 * 
 * Routing logic:
 * 1. If called number is Baylio sales line → route to Sales Agent
 * 2. If called number matches a shop → route to shop-specific agent
 * 3. Otherwise → voicemail fallback
 */
twilioRouter.post("/voice", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { To, From, CallSid, CallStatus } = req.body;

    console.log(`[CALL] Inbound call: ${From} → ${To} (SID: ${CallSid})`);

    // ─── Route 1: Baylio Sales Line ─────────────────────────────
    if (isBaylioSalesLine(To)) {
      console.log(`[CALL] Sales line detected — routing to Baylio Sales Agent`);

      try {
        const twiml = await handleSalesLineCall(From, To);
        console.log(`[CALL] Sales line registered OK (${Date.now() - startTime}ms)`);
        res.type("text/xml");
        return res.send(twiml);
      } catch (error) {
        console.error("[CALL] Sales line ElevenLabs error:", error);
        res.type("text/xml");
        return res.send(generateVoicemailTwiML("Baylio"));
      }
    }

    // ─── Route 2: Shop-Specific Call ────────────────────────────
    const resolved = await resolveShopContext(To);

    if (!resolved) {
      console.warn(`[CALL] No shop found for number: ${To}`);
      res.type("text/xml");
      return res.send(generateVoicemailTwiML("this business"));
    }

    const { shopId, context, elevenLabsAgentId } = resolved;

    // Check if ElevenLabs agent is configured
    if (!elevenLabsAgentId) {
      console.warn(`[CALL] No ElevenLabs agent configured for shop ${shopId}`);
      res.type("text/xml");
      return res.send(generateVoicemailTwiML(context.shopName));
    }

    // Register call with compiled prompt override
    console.log(`[CALL] Registering call with ElevenLabs agent ${elevenLabsAgentId} for shop ${shopId}...`);

    const twiml = await handleShopCall(
      From, To, shopId, context, elevenLabsAgentId
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
          // Skip DB logging for sales line calls (no shop to associate)
          if (isBaylioSalesLine(To)) {
            console.log(`[CALL-STATUS] Sales line call ${CallSid} — ${CallStatus} (no DB logging for sales calls)`);
            return;
          }

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

    res.type("text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  } catch (error) {
    console.error("[TRANSCRIPTION] Error:", error);
    res.type("text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
});

export { twilioRouter };
