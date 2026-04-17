/**
 * One-time setup: Make Sam fully agentic.
 *
 * What it does:
 *   1. Pushes the canonical prompt from server/services/samPrompt.md → Sam's
 *      ElevenLabs agent (with {{caller_context}} + {{caller_phone}} slots).
 *   2. Registers 5 tools on Sam:
 *        - capture_lead (webhook)
 *        - send_sms_followup (webhook)
 *        - send_email_followup (webhook)
 *        - start_onboarding_assist (webhook)
 *        - transfer_to_human (webhook — returns transfer instructions)
 *   3. Configures the post-call webhook → /api/elevenlabs/conversation
 *   4. Sets the multilingual voice model.
 *
 * Required env (loaded from .env.local — pull first with `vercel env pull .env.local`):
 *   - ELEVENLABS_API_KEY
 *   - SAM_TOOL_SECRET     (shared secret ElevenLabs sends as x-sam-tool-secret)
 *   - PUBLIC_BASE_URL     (defaults to https://baylio.io)
 *
 * Run: node scripts/setup-sam.mjs
 * Safe to re-run — it always overwrites the prompt + tool config.
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local if present
try {
  const env = readFileSync(resolve(__dirname, "..", ".env.local"), "utf-8");
  for (const line of env.split("\n")) {
    const [k, ...rest] = line.split("=");
    if (k && rest.length && !process.env[k.trim()]) {
      process.env[k.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
    }
  }
} catch {}

const SAM_AGENT_ID = "agent_8401kkzx0edafhbb0c56a04d1kmb";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || "https://baylio.io").replace(/\/$/, "");
const POST_CALL_WEBHOOK = `${PUBLIC_BASE_URL}/api/elevenlabs/conversation`;
const TOOL_BASE = `${PUBLIC_BASE_URL}/api/sam`;

const API_KEY = process.env.ELEVENLABS_API_KEY;
const TOOL_SECRET = process.env.SAM_TOOL_SECRET;

if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY not set. Run: vercel env pull .env.local");
  process.exit(1);
}
if (!TOOL_SECRET) {
  console.warn(
    "SAM_TOOL_SECRET not set. Tool endpoints will be unauthenticated in dev — add it to Vercel + .env.local before production traffic hits Sam."
  );
}

const headers = { "xi-api-key": API_KEY, "Content-Type": "application/json" };

// ─── Load prompt ────────────────────────────────────────────────────

const promptPath = resolve(__dirname, "..", "server", "services", "samPrompt.md");
const promptText = readFileSync(promptPath, "utf-8");
console.log(`Loaded prompt: ${promptText.length} chars`);

if (!promptText.includes("{{caller_context}}")) {
  console.error("ERROR: samPrompt.md missing {{caller_context}} slot");
  process.exit(1);
}
if (!promptText.includes("{{caller_phone}}")) {
  console.error("ERROR: samPrompt.md missing {{caller_phone}} slot");
  process.exit(1);
}

// ─── Tool definitions ───────────────────────────────────────────────

const toolAuthHeaders = TOOL_SECRET
  ? [{ type: "value", name: "x-sam-tool-secret", value: TOOL_SECRET }]
  : [];

const tools = [
  {
    type: "webhook",
    name: "capture_lead",
    description:
      "Save the caller's info to Baylio's CRM (DB + HubSpot). Call this AS SOON as you have the caller's first name + a sense of their intent. Don't wait for the end of the call. Phone number is auto-filled from the call.",
    api_schema: {
      url: `${TOOL_BASE}/lead`,
      method: "POST",
      request_headers: toolAuthHeaders,
      request_body_schema: {
        type: "object",
        required: ["caller_phone"],
        properties: {
          caller_phone: { type: "string", description: "Caller's phone (use {{caller_phone}})" },
          name: { type: "string", description: "Caller's full name if known" },
          email: { type: "string", description: "Caller's email if known" },
          shop_name: { type: "string", description: "Their auto repair shop name (if prospect)" },
          city: { type: "string", description: "Shop city" },
          intent: {
            type: "string",
            enum: [
              "shop_owner_prospect",
              "curious_tester",
              "car_question",
              "existing_customer",
              "onboarding_help",
              "other",
            ],
            description: "Best guess at why they called",
          },
          intent_summary: {
            type: "string",
            description:
              "1-2 sentence summary of what they asked / what stage they're at",
          },
          language: {
            type: "string",
            description: "Primary language code (en/es/ar/pt/hi/bn/it/tr)",
          },
          marketing_consent: {
            type: "boolean",
            description: "True ONLY if caller explicitly agreed to marketing follow-ups",
          },
          conversation_id: {
            type: "string",
            description: "ElevenLabs conversation ID — pass {{system__conversation_id}}",
          },
        },
      },
    },
  },
  {
    type: "webhook",
    name: "send_sms_followup",
    description:
      "Send a follow-up SMS to the caller's phone. Get explicit consent first ('Cool if I text you a quick recap?'). The summary should be a short 1-2 sentence value prop or recap.",
    api_schema: {
      url: `${TOOL_BASE}/sms`,
      method: "POST",
      request_headers: toolAuthHeaders,
      request_body_schema: {
        type: "object",
        required: ["caller_phone", "content_summary"],
        properties: {
          caller_phone: { type: "string", description: "Use {{caller_phone}}" },
          content_summary: {
            type: "string",
            description:
              "1-3 sentence message body. Will be wrapped with 'Hey, it's Sam from Baylio' and a baylio.io link.",
          },
          marketing_consent: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "webhook",
    name: "send_email_followup",
    description:
      "Send a recap email. Get the email + consent first. Use this for shop owners who want pricing/details in writing.",
    api_schema: {
      url: `${TOOL_BASE}/email`,
      method: "POST",
      request_headers: toolAuthHeaders,
      request_body_schema: {
        type: "object",
        required: ["caller_phone", "email", "content_summary"],
        properties: {
          caller_phone: { type: "string", description: "Use {{caller_phone}}" },
          email: { type: "string" },
          content_summary: {
            type: "string",
            description: "Body of the email. Plain prose, can be multiple paragraphs.",
          },
          marketing_consent: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "webhook",
    name: "start_onboarding_assist",
    description:
      "Flag a serious sign-up prospect for hands-on onboarding by the Baylio team. Call this when caller commits to trying Baylio.",
    api_schema: {
      url: `${TOOL_BASE}/onboard`,
      method: "POST",
      request_headers: toolAuthHeaders,
      request_body_schema: {
        type: "object",
        required: ["caller_phone"],
        properties: {
          caller_phone: { type: "string", description: "Use {{caller_phone}}" },
          name: { type: "string" },
          email: { type: "string" },
          language: { type: "string" },
          notes: {
            type: "string",
            description: "Anything specific about their setup (locations, current solution, etc.)",
          },
        },
      },
    },
  },
  {
    type: "webhook",
    name: "transfer_to_human",
    description:
      "Hand off the call to Abdur (Baylio founder) at 201-321-2235. Use only when caller insists on a human OR situation is account-critical (refund, cancellation, complaint, custom enterprise pricing). ALWAYS confirm with caller first: 'Want me to connect you to Abdur right now?' After this call returns, say a brief handoff line and the call will transfer.",
    api_schema: {
      url: `${TOOL_BASE}/transfer`,
      method: "POST",
      request_headers: toolAuthHeaders,
      request_body_schema: {
        type: "object",
        required: ["caller_phone"],
        properties: {
          caller_phone: { type: "string", description: "Use {{caller_phone}}" },
          reason: { type: "string", description: "Why the transfer is happening" },
        },
      },
    },
  },
];

// ─── Push agent config ──────────────────────────────────────────────

const payload = {
  conversation_config: {
    agent: {
      prompt: {
        prompt: promptText,
        tools,
        // Sam needs awareness of returning callers — the LLM uses these slots.
        // ElevenLabs requires dynamic vars to be declared in the prompt template,
        // which they already are above as {{caller_context}} and {{caller_phone}}.
      },
      first_message:
        "Hey! Thanks for calling Baylio — Sam here, what can I do for you?",
      language: "en",
    },
    tts: {
      // Multilingual model so non-English languages don't sound like a news anchor.
      model_id: "eleven_turbo_v2_5",
      stability: 0.55,
      similarity_boost: 0.75,
      style: 0.4,
      optimize_streaming_latency: 3,
      agent_output_audio_format: "ulaw_8000",
    },
    asr: {
      quality: "high",
      user_input_audio_format: "ulaw_8000",
    },
    conversation: {
      max_duration_seconds: 1800,
      client_events: ["agent_response", "user_transcript"],
    },
  },
  platform_settings: {
    auth: { enable_auth: false },
  },
};

console.log(`Patching Sam (${SAM_AGENT_ID})...`);
console.log(`  Prompt: ${promptText.length} chars`);
console.log(`  Tools: ${tools.length} (${tools.map((t) => t.name).join(", ")})`);
console.log(`  Tool base URL: ${TOOL_BASE}`);
console.log(`  Tool auth: ${TOOL_SECRET ? "x-sam-tool-secret header" : "NONE (dev only)"}`);
console.log(`  Post-call webhook: ${POST_CALL_WEBHOOK}`);

const patchRes = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${SAM_AGENT_ID}`,
  { method: "PATCH", headers, body: JSON.stringify(payload) }
);

if (!patchRes.ok) {
  console.error(`Failed to update Sam (${patchRes.status}):`);
  console.error(await patchRes.text());
  process.exit(1);
}
console.log("✓ Sam's prompt + tools updated");

// ─── Configure post-call webhook ────────────────────────────────────

console.log("Configuring post-call webhook...");
const webhookRes = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${SAM_AGENT_ID}`,
  {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      platform_settings: {
        auth: { enable_auth: false },
        post_call_webhook_url: POST_CALL_WEBHOOK,
      },
    }),
  }
);

if (!webhookRes.ok) {
  const errText = await webhookRes.text();
  console.warn(
    `Post-call webhook config returned ${webhookRes.status}.\n` +
    `If this isn't 200, configure it manually:\n` +
    `  ElevenLabs → Sam agent → Settings → Post-Call Webhook → ${POST_CALL_WEBHOOK}\n` +
    `Response: ${errText}`
  );
} else {
  console.log(`✓ Post-call webhook → ${POST_CALL_WEBHOOK}`);
}

console.log("\n🎉 Sam is fully agentic.\n");
console.log("Next steps:");
console.log("  1. Call 844-875-2441 to test");
console.log("  2. Watch logs: vercel logs --follow");
console.log("  3. Check leads at https://baylio.io/admin/sam-leads (admin login required)");
