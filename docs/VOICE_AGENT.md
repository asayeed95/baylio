# Baylio — Voice Agent Architecture

> This document describes the end-to-end voice AI system that powers Baylio's phone call handling. It covers the inbound call flow, ElevenLabs agent management, prompt compilation, Twilio telephony integration, post-call processing, and the context caching layer.

---

## System Overview

Baylio's voice agent answers inbound phone calls for auto repair shops using a three-layer architecture:

```
Customer Phone Call
       │
       ▼
┌─────────────────┐
│   Twilio         │  ← Receives the call, validates webhook signature
│   (Telephony)    │  ← Routes to /api/twilio/voice
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Baylio Server  │  ← Looks up shop config from context cache
│   (Orchestrator) │  ← Compiles system prompt via promptCompiler
│                  │  ← Registers call with ElevenLabs API
│                  │  ← Returns TwiML to bridge call to ElevenLabs
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   ElevenLabs     │  ← Handles real-time voice conversation
│   (Voice AI)     │  ← Uses compiled prompt + shop context
│                  │  ← Manages turn-taking, speech synthesis, STT
└────────┬────────┘
         │
         ▼ (call ends)
┌─────────────────┐
│   Post-Call      │  ← Transcription → LLM analysis → DB write
│   Pipeline       │  ← SMS recap to shop manager
│                  │  ← Notification creation
└─────────────────┘
```

---

## Key Files

| File | Purpose |
|---|---|
| `server/services/twilioWebhooks.ts` | Express router for `/api/twilio/*` endpoints |
| `server/services/elevenLabsService.ts` | ElevenLabs REST API client (agent CRUD) |
| `server/services/promptCompiler.ts` | Shop context → compiled system prompt + greeting |
| `server/services/contextCache.ts` | In-memory hot cache for shop configs |
| `server/services/postCallPipeline.ts` | Async post-call processing (transcription → analysis → DB) |
| `server/services/smsService.ts` | Twilio SMS for post-call recaps and alerts |
| `server/services/twilioProvisioning.ts` | Phone number search, purchase, release |
| `server/middleware/twilioValidation.ts` | HMAC-SHA1 webhook signature verification |
| `scripts/update-elevenlabs-agent.mjs` | One-off script to update the default ElevenLabs agent |
| `drizzle/schema.ts` | `agent_configs` and `call_logs` table definitions |

---

## Inbound Call Flow (Step by Step)

### Step 1: Customer Calls the Shop Number

The customer dials the shop's Twilio-provisioned phone number. Twilio receives the call and sends an HTTP POST to the configured webhook URL.

### Step 2: Webhook Signature Validation

The request hits `POST /api/twilio/voice`. The `twilioValidation` middleware verifies the HMAC-SHA1 signature using the Twilio Auth Token to ensure the request is genuinely from Twilio. If validation fails, the request is rejected with a 403 status.

### Step 3: Shop Lookup via Context Cache

The webhook handler extracts the `To` phone number from the request and looks up the corresponding shop in the **context cache** (`contextCache.ts`). The cache stores pre-loaded shop configurations in memory for sub-second lookups, avoiding a database query on every call.

If no shop is found for the phone number, the handler falls back to the default ElevenLabs agent (configured via `ELEVENLABS_AGENT_ID` environment variable).

### Step 4: Prompt Compilation

If a shop is found, the **prompt compiler** (`promptCompiler.ts`) takes the shop's context and generates a complete system prompt. The compiler uses a template system with the following variables:

| Variable | Source | Example |
|---|---|---|
| `{{SHOP_NAME}}` | `shops.name` | "Mike's Auto Repair" |
| `{{AGENT_NAME}}` | `agent_configs.agentName` | "Sam" |
| `{{SHOP_PHONE}}` | `shops.phone` | "(555) 123-4567" |
| `{{BUSINESS_HOURS}}` | `shops.businessHours` | "Mon-Fri 8AM-6PM, Sat 9AM-2PM" |
| `{{SERVICE_CATALOG}}` | `shops.serviceCatalog` | "Oil Change ($39.99), Brake Pads ($149.99)..." |
| `{{CURRENT_PROMOS}}` | `shops.currentPromos` | "Free brake inspection with any service" |
| `{{TIMEZONE}}` | `shops.timezone` | "America/New_York" |
| `{{VOICE_PERSONA}}` | `agent_configs.voicePersona` | "friendly_advisor" |
| `{{CONFIDENCE_THRESHOLD}}` | `agent_configs.confidenceThreshold` | "0.70" |

The compiler also generates a **first message** (greeting) that includes the shop name and agent name.

### Step 5: ElevenLabs Call Registration

The server calls the ElevenLabs Register Call API to create a new conversation session. The request includes:

- The compiled system prompt
- The first message (greeting)
- The agent ID (shop-specific or default)
- `conversation_initiation_client_data` containing the shop context

ElevenLabs returns a WebSocket URL for the real-time voice conversation.

### Step 6: TwiML Response

The webhook handler returns TwiML (Twilio Markup Language) that instructs Twilio to bridge the phone call to the ElevenLabs WebSocket. The customer now hears the AI agent's greeting and can have a natural conversation.

### Step 7: Real-Time Conversation

ElevenLabs handles the real-time voice interaction:

- **Speech-to-Text (STT):** Converts the customer's speech to text
- **LLM Processing:** Processes the text through the system prompt to generate a response
- **Text-to-Speech (TTS):** Converts the response back to speech using the configured voice
- **Turn Management:** Handles turn-taking with configurable patience and timeout settings

### Step 8: Call Ends

When the call ends (customer hangs up, agent ends call, or timeout), Twilio sends a status callback to `POST /api/twilio/status`.

### Step 9: Post-Call Pipeline

The status callback triggers the **post-call pipeline** (`postCallPipeline.ts`), which runs asynchronously:

1. **Transcription** — If a recording exists, it's transcribed using the Whisper API via `transcribeAudio()`
2. **LLM Analysis** — The transcription is analyzed by the built-in LLM to extract:
   - Caller intent (appointment, pricing, emergency, general inquiry)
   - Sentiment (positive, neutral, negative)
   - Vehicle information (year, make, model)
   - Services discussed
   - Whether an appointment was booked
   - Estimated revenue
   - QA flags (issues, missed opportunities)
   - Call summary
3. **Database Write** — The call log record is created/updated with all extracted data
4. **SMS Recap** — A post-call summary SMS is sent to the shop manager via `sendPostCallRecap()`
5. **Notifications** — In-app notifications are created for high-value leads and missed calls
6. **Usage Tracking** — Call duration is recorded against the shop's subscription for billing

---

## Prompt Compiler Deep Dive

The prompt compiler (`server/services/promptCompiler.ts`) is the brain of the voice agent's behavior. It takes a `ShopContext` object and produces a complete system prompt.

### ShopContext Interface

```ts
interface ShopContext {
  shopName: string;
  agentName: string;
  shopPhone: string;
  businessHours: Record<string, string>;
  serviceCatalog: ServiceItem[];
  currentPromos: Promo[];
  timezone: string;
  voicePersona: 'friendly_advisor' | 'professional_technician' | 'sales_focused';
  confidenceThreshold: number;
  upsellEnabled: boolean;
  upsellRules: UpsellRule[];
  systemPromptOverride?: string;
  greeting?: string;
}
```

### Persona Templates

The compiler includes three built-in persona templates:

| Persona | Tone | Best For |
|---|---|---|
| `friendly_advisor` | Warm, conversational, uses contractions | General shops, family-owned businesses |
| `professional_technician` | Precise, knowledgeable, formal | High-end shops, dealerships |
| `sales_focused` | Energetic, proactive, upsell-oriented | Shops focused on revenue growth |

### 3-Stage Reasoning Architecture

The compiled prompt includes a three-stage reasoning framework for intelligent service recommendations:

1. **Symptom Extraction** — Identify what the customer is describing (e.g., "squeaking when I brake")
2. **Catalog Mapping** — Match symptoms to services in the shop's catalog with confidence scores
3. **Natural Offer** — If confidence exceeds the threshold, naturally suggest the service; if below, ask clarifying questions

The confidence threshold behavior:

| Confidence | Action |
|---|---|
| HIGH (>= threshold) | Offer the service naturally in conversation |
| MEDIUM (threshold - 0.2 to threshold) | Ask clarifying questions before offering |
| LOW (< threshold - 0.2) | Book appointment only, don't suggest services |

### Custom Prompt Override

If `agent_configs.systemPromptOverride` is set, it replaces the compiled prompt entirely. This allows shop owners to write their own system prompt from scratch.

---

## Context Cache

The context cache (`server/services/contextCache.ts`) is an in-memory store that keeps shop configurations pre-loaded for instant access during inbound calls. This eliminates database queries on the critical path of call handling.

The cache is implemented as a singleton `ContextCache` class with the following behavior:

- **Initialization:** On server start, loads all active shops with their agent configs into memory
- **Lookup:** `getByPhoneNumber(twilioPhoneNumber)` returns the full shop context in O(1)
- **Refresh:** Automatically refreshes when shop configs are updated via tRPC procedures
- **TTL:** Entries expire after a configurable period (default: 5 minutes) and are re-fetched on next access

---

## ElevenLabs Agent Management

The ElevenLabs service (`server/services/elevenLabsService.ts`) provides CRUD operations for conversational agents:

| Function | Description |
|---|---|
| `createConversationalAgent(config)` | Creates a new ElevenLabs agent with voice, prompt, and turn settings |
| `updateConversationalAgent(agentId, config)` | Updates an existing agent's configuration |
| `deleteConversationalAgent(agentId)` | Deletes an agent |
| `getAgent(agentId)` | Retrieves agent configuration |
| `listVoices()` | Lists available ElevenLabs voices |
| `getSubscriptionInfo()` | Gets ElevenLabs account usage/limits |
| `getConversationHistory(agentId)` | Gets past conversations for an agent |

### Agent Configuration

Each ElevenLabs agent has the following configuration:

```ts
{
  name: "Baylio — Sam (Service Advisor)",
  conversation_config: {
    agent: {
      prompt: { prompt: "<compiled system prompt>" },
      first_message: "Thanks for calling — this is Sam with Mike's Auto Repair...",
      language: "en",
    },
    tts: {
      voice_id: "cjVigY5qzO86Huf0OWal",  // Selected voice
    },
    turn: {
      turn_timeout: 10,            // Wait 10s for customer to speak
      initial_wait_time: 2,        // 2s pause after greeting
      silence_end_call_timeout: 30, // End call after 30s silence
      mode: "turn",
      turn_eagerness: "patient",   // Don't interrupt
    },
  },
}
```

---

## Twilio Phone Number Provisioning

The Twilio provisioning service (`server/services/twilioProvisioning.ts`) manages phone numbers:

| Function | Description |
|---|---|
| `validateTwilioCredentials()` | Checks if Twilio SID/token are valid |
| `searchAvailableNumbers(areaCode?, contains?)` | Searches for available local numbers |
| `purchasePhoneNumber(phoneNumber, friendlyName)` | Purchases a number and configures webhooks |
| `updatePhoneWebhooks(phoneSid, voiceUrl, statusUrl)` | Updates webhook URLs for a number |
| `releasePhoneNumber(phoneSid)` | Releases a number back to Twilio |
| `listOwnedNumbers()` | Lists all numbers on the account |
| `getAccountBalance()` | Gets the Twilio account balance |

When a number is purchased, webhooks are automatically configured to point at:

- Voice URL: `https://baylio.io/api/twilio/voice`
- Status Callback: `https://baylio.io/api/twilio/status`

---

## Webhook Security

All Twilio webhooks are protected by HMAC-SHA1 signature validation (`server/middleware/twilioValidation.ts`):

1. Twilio signs each webhook request using the account's Auth Token
2. The middleware reconstructs the signature from the request URL and body
3. A timing-safe comparison verifies the signature matches
4. Invalid signatures are rejected with a 403 status and logged for forensic analysis

The validation can be toggled via the `TWILIO_VALIDATION_ENABLED` environment variable (defaults to `true`). In log-only mode, invalid signatures are logged but not rejected.

---

## SMS Service

The SMS service (`server/services/smsService.ts`) sends text messages via Twilio for:

| Function | Description |
|---|---|
| `sendPostCallRecap(recap)` | Sends a call summary to the shop manager after each call |
| `sendHighValueAlert(details)` | Alerts the shop owner when a high-value lead calls |
| `sendWeeklySummary(stats)` | Sends a weekly performance summary |
| `sendSMS(payload)` | Low-level SMS send function |

---

## Default Agent vs. Shop-Specific Agents

The system supports two modes:

**Default Agent** — When no shop-specific agent is configured, the system uses the agent specified by the `ELEVENLABS_AGENT_ID` environment variable. This agent has a generic Baylio prompt (updated via `scripts/update-elevenlabs-agent.mjs`).

**Shop-Specific Agent** — When a shop has an `elevenLabsAgentId` in its database record, the system uses that agent and overrides its prompt at call time via `conversation_initiation_client_data`. This allows each shop to have a unique voice, persona, and context without creating separate ElevenLabs agents.

---

## Troubleshooting

| Issue | Likely Cause | Fix |
|---|---|---|
| "Application error" on call | Webhook URL not configured or server unreachable | Check Twilio console → Phone Numbers → Voice webhook URL |
| Generic greeting ("How can I help you?") | Agent not updated with shop prompt | Run `node scripts/update-elevenlabs-agent.mjs` or check shop's `elevenLabsAgentId` |
| Agent talks too fast / interrupts | Turn settings too aggressive | Set `turn_eagerness: "patient"` and `initial_wait_time: 2` |
| No post-call analysis | Status callback not configured | Verify Twilio status callback URL points to `/api/twilio/status` |
| Webhook signature failures | Clock skew or wrong auth token | Verify `TWILIO_AUTH_TOKEN` matches the Twilio console |
| Context cache stale | Shop config updated but cache not refreshed | Cache auto-refreshes on TTL expiry; restart server to force refresh |
