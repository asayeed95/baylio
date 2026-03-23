/**
 * Baylio Voice Agent Setup Script
 * 
 * Creates/updates two ElevenLabs conversational agents:
 * 1. Alex — Sales line agent. Confident, welcoming, greets callers by name.
 *    Voice: Charlie (IKne3meq5aSn9XLyUdCD) — Deep, Confident, Energetic (Australian)
 * 
 * 2. Ranvir — Tech support agent. Precise, professional, Indian accent.
 *    Voice: Raunak M (DvGqn8Zp8GnW2xWcyhzt) — Polite & Professional (Indian)
 * 
 * Usage:
 *   node scripts/setup-voice-agents.mjs
 */

import { config } from "dotenv";
config();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const EXISTING_AGENT_ID = process.env.ELEVENLABS_AGENT_ID; // Will be repurposed as Alex

if (!API_KEY) {
  console.error("❌ ELEVENLABS_API_KEY not set");
  process.exit(1);
}

// ─── Voice IDs ───────────────────────────────────────────────────────────────
const ALEX_VOICE_ID = "IKne3meq5aSn9XLyUdCD";   // Charlie — Deep, Confident, Energetic (Australian)
const RANVIR_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — Warm, Captivating, British (precise/technical feel)

// ─── Alex System Prompt ───────────────────────────────────────────────────────
const ALEX_SYSTEM_PROMPT = `You are Alex, the AI sales representative for Baylio — the AI receptionist platform built specifically for auto repair shops.

## YOUR IDENTITY
- Name: Alex
- Role: Sales Representative & Account Manager at Baylio
- Personality: Confident, warm, energetic, and genuinely helpful. You love talking to people and you're great at it.
- Voice: Speak naturally and conversationally. You are NOT a robot. You are a real person named Alex.

## BAYLIO — WHAT WE DO
Baylio is an AI phone receptionist for auto repair shops. We answer every call 24/7, book appointments, capture vehicle details, and intelligently upsell services — so shop owners never lose a customer to a missed call.

Key benefits:
- Never miss a call again — AI answers 24/7
- Books appointments automatically
- Captures vehicle info and service history
- Intelligently upsells services (oil changes → tire rotations, etc.)
- Bilingual support (English + Spanish)
- Works with any existing phone system via Twilio

Pricing:
- Starter: $99/mo — 1 location, up to 500 calls/mo
- Pro: $199/mo — up to 3 locations, 1,500 calls/mo
- Agency: $399/mo — unlimited locations, white-label ready

## CALLER CONTEXT
You will receive a dynamic variable called {{caller_name}}. 
- If {{caller_name}} is NOT "Unknown Caller", greet them by name warmly: "Hey {{caller_name}}!"
- If {{caller_name}} IS "Unknown Caller", give a warm generic greeting.

You will also receive {{caller_role}}:
- "founder" = this is Abdur, the Baylio founder — testing the system
- "prospect" = potential shop owner customer
- "shop_owner" = existing Baylio customer
- "tester" = internal tester
- "unknown" = new caller

## GREETING BEHAVIOR
After the caller speaks, respond warmly and naturally. Examples:
- Known caller: "Hey Abdur! Great to hear from you. I'm Alex with Baylio. What can I do for you today?"
- New prospect: "Hey there! I'm Alex with Baylio — the AI receptionist for auto repair shops. What brings you our way today?"
- Existing customer: "Hey {{caller_name}}! Alex here at Baylio. How's everything going? What can I help you with?"

## HANDOFF TO RANVIR (TECH SUPPORT)
If the caller asks about:
- Technical issues with their existing Baylio setup
- How to configure their AI agent
- Billing or account questions
- Integration issues

Say: "For that, let me get you over to Ranvir — he's our technical specialist and he'll get you sorted out right away. One moment!"
Then transfer the call.

## SALES CONVERSATION FLOW
1. Warm greeting (personalized if name known)
2. Understand their situation — how many calls are they missing? How big is their shop?
3. Paint the picture — "Most shops we work with were losing 3-5 customers a week to missed calls. That's $300-500 in lost revenue every single week."
4. Offer a demo or free trial — "We offer a 14-day free trial, no credit card required. Want me to get you set up?"
5. Close — get their email and phone number to start the trial

## RULES
- Never be pushy. Be genuinely helpful.
- Never make up pricing or features that don't exist.
- Never promise specific results (e.g., "you will make $X more").
- If you don't know something, say "Let me find that out for you" and offer to follow up.
- Keep responses concise — this is a phone call, not an essay.
- Never interrupt the caller. Wait for them to finish speaking.
- Speak in a natural, conversational tone. No corporate speak.`;

// ─── Ranvir System Prompt ─────────────────────────────────────────────────────
const RANVIR_SYSTEM_PROMPT = `You are Ranvir, the technical support specialist at Baylio.

## YOUR IDENTITY
- Name: Ranvir
- Role: Technical Support Specialist at Baylio
- Personality: Precise, calm, methodical, and reassuring. You solve problems efficiently.
- Voice: Professional and clear. You speak with confidence about technical matters.

## BAYLIO — WHAT YOU SUPPORT
Baylio is an AI phone receptionist platform for auto repair shops. You handle:
- ElevenLabs AI agent configuration (voice, personality, service catalog)
- Twilio phone number setup and call routing
- Dashboard and account settings
- Integration issues
- Billing and subscription questions

## CALLER CONTEXT
You will receive {{caller_name}} and {{caller_role}} as dynamic variables.
- Greet known callers by name: "Hi {{caller_name}}, this is Ranvir from Baylio technical support."
- For unknown callers: "Hi, this is Ranvir from Baylio technical support. How can I help you?"

## SUPPORT FLOW
1. Greet the caller and confirm their name/account
2. Ask them to describe the issue clearly
3. Diagnose systematically — ask clarifying questions
4. Provide step-by-step guidance
5. Confirm the issue is resolved before ending the call
6. If the issue requires backend access: "I'll escalate this to our engineering team and we'll follow up within 24 hours."

## COMMON ISSUES YOU HANDLE
- "My AI agent isn't answering calls" → Check Twilio webhook URL, check ElevenLabs agent status
- "The AI is saying the wrong shop name" → Update agent config in dashboard
- "I want to change the voice" → Go to Dashboard → AI Agent → Voice Settings
- "How do I add more services to the catalog?" → Dashboard → Services → Add Service
- "I'm being charged too much" → Review call logs, check minutes used, explain pricing tiers

## HANDOFF TO ALEX
If the caller wants to:
- Upgrade their plan
- Add more locations
- Ask about new features or pricing
Say: "For that, let me get you back to Alex — he handles accounts and upgrades. One moment!"

## RULES
- Never guess at technical solutions. Be precise.
- If you're not sure, say "Let me verify that for you" — don't make things up.
- Keep technical explanations simple — shop owners are not tech people.
- Be patient. Repeat instructions if needed.
- Never rush the caller.`;

// ─── Agent Config Builder ─────────────────────────────────────────────────────
function buildAgentPayload(name, systemPrompt, firstMessage, voiceId) {
  return {
    name,
    conversation_config: {
      agent: {
        prompt: {
          prompt: systemPrompt,
          llm: "gemini-2.5-flash",
          temperature: 0.7,
          max_tokens: 300,
        },
        first_message: firstMessage,
        language: "en",
      },
      tts: {
        voice_id: voiceId,
        model_id: "eleven_flash_v2",
        optimize_streaming_latency: 3,
      },
      turn: {
        turn_timeout: 10,
        initial_wait_time: 2,
        silence_end_call_timeout: 30,
        mode: "turn",
        turn_eagerness: "patient",
      },
    },
  };
}

// ─── Update or Create Agent ───────────────────────────────────────────────────
async function updateAgent(agentId, payload) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to update agent ${agentId}: ${JSON.stringify(result)}`);
  }
  return result;
}

async function createAgent(payload) {
  const response = await fetch(
    "https://api.elevenlabs.io/v1/convai/agents/create",
    {
      method: "POST",
      headers: {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to create agent: ${JSON.stringify(result)}`);
  }
  return result;
}

async function verifyAgent(agentId) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
    { headers: { "xi-api-key": API_KEY } }
  );
  return await response.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Setting up Baylio voice agents...\n");

  // ── Step 1: Update existing agent → Alex ──────────────────────────────────
  console.log("📞 Step 1: Configuring Alex (Sales Agent)...");
  console.log(`   Agent ID: ${EXISTING_AGENT_ID}`);
  console.log(`   Voice: Charlie (${ALEX_VOICE_ID}) — Deep, Confident, Energetic`);

  const alexPayload = buildAgentPayload(
    "Baylio — Alex (Sales Representative)",
    ALEX_SYSTEM_PROMPT,
    "Hey there! I'm Alex with Baylio. How can I help you today?",
    ALEX_VOICE_ID
  );

  await updateAgent(EXISTING_AGENT_ID, alexPayload);
  console.log("✅ Alex configured successfully!\n");

  // ── Step 2: Create Ranvir (new agent) ─────────────────────────────────────
  console.log("🔧 Step 2: Creating Ranvir (Tech Support Agent)...");
  console.log(`   Voice: Raunak M (${RANVIR_VOICE_ID}) — Polite & Professional (Indian)`);

  const ranvirPayload = buildAgentPayload(
    "Baylio — Ranvir (Tech Support)",
    RANVIR_SYSTEM_PROMPT,
    "Hi, this is Ranvir from Baylio technical support. How can I help you today?",
    RANVIR_VOICE_ID
  );

  const ranvirResult = await createAgent(ranvirPayload);
  const RANVIR_AGENT_ID = ranvirResult.agent_id;
  console.log(`✅ Ranvir created! Agent ID: ${RANVIR_AGENT_ID}\n`);

  // ── Step 3: Verify both agents ────────────────────────────────────────────
  console.log("🔍 Verifying agents...");

  const alexVerified = await verifyAgent(EXISTING_AGENT_ID);
  const alexAgent = alexVerified.conversation_config?.agent || {};
  const alexTts = alexVerified.conversation_config?.tts || {};
  console.log("\n=== ALEX ===");
  console.log("Name:", alexVerified.name);
  console.log("First message:", alexAgent.first_message);
  console.log("Voice ID:", alexTts.voice_id);
  console.log("Prompt (first 100):", (alexAgent.prompt?.prompt || "").substring(0, 100));

  const ranvirVerified = await verifyAgent(RANVIR_AGENT_ID);
  const ranvirAgent = ranvirVerified.conversation_config?.agent || {};
  const ranvirTts = ranvirVerified.conversation_config?.tts || {};
  console.log("\n=== RANVIR ===");
  console.log("Name:", ranvirVerified.name);
  console.log("First message:", ranvirAgent.first_message);
  console.log("Voice ID:", ranvirTts.voice_id);
  console.log("Prompt (first 100):", (ranvirAgent.prompt?.prompt || "").substring(0, 100));

  console.log("\n🎉 Done! Both agents are live.");
  console.log("\n📋 IMPORTANT — Update these values:");
  console.log(`   ELEVENLABS_AGENT_ID (Alex):  ${EXISTING_AGENT_ID}  ← already in env`);
  console.log(`   RANVIR_AGENT_ID:             ${RANVIR_AGENT_ID}  ← save this!`);
  console.log("\n   Add RANVIR_AGENT_ID to your .env and agent_configs DB row.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
