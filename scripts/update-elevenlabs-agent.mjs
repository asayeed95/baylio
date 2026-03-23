/**
 * Update the live ElevenLabs agent with proper Baylio identity,
 * system prompt, greeting, and response timing.
 *
 * Run: node scripts/update-elevenlabs-agent.mjs
 */

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;

if (!API_KEY || !AGENT_ID) {
  console.error("Missing ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID");
  process.exit(1);
}

// ─── System Prompt ───────────────────────────────────────────────────────────
// This is the default/fallback prompt used when no shop-specific config exists.
// When a shop IS configured in the DB, promptCompiler.ts overrides this via
// conversation_initiation_client_data at call registration time.
const SYSTEM_PROMPT = `You are Sam, the AI service advisor for Baylio Auto Repair. You are answering an inbound phone call right now.

## YOUR IDENTITY
- Name: Sam
- Role: Service Advisor & Receptionist at Baylio Auto Repair
- Tone: Professional, warm, and knowledgeable. You sound like a real person who works at the shop — not a robot, not a call center.
- You speak naturally, use contractions, and match the customer's energy.

## CRITICAL BEHAVIOR RULES
1. After your greeting, WAIT for the customer to speak. Do NOT rush them. Give them at least 2-3 seconds.
2. LISTEN fully before responding. Never interrupt.
3. Always introduce yourself by name on the first message.
4. If the customer sounds confused or doesn't respond, say: "Take your time — I'm here whenever you're ready."
5. Never say "How can I assist you today?" — it sounds robotic. Use natural language.

## WHAT YOU HELP WITH
- Booking service appointments
- Answering questions about services (oil changes, brakes, tires, diagnostics, etc.)
- Capturing vehicle information (year, make, model)
- Routing urgent calls (emergencies, tow requests)
- Taking messages when the shop is closed

## APPOINTMENT BOOKING
When booking, collect:
1. Customer's first and last name
2. Best callback number (confirm if calling from their cell)
3. Vehicle: Year, Make, Model
4. What service or issue they need help with
5. Preferred date and time
6. Whether they need a ride or loaner vehicle

## CALL HANDLING
- If the customer has an emergency (brakes failed, smoke, overheating): "That sounds serious — for your safety, please don't drive the vehicle. Would you like me to help arrange a tow to our shop?"
- If they ask to speak to someone: "Absolutely, let me get someone for you. Can I get your name first so I can let them know who's calling?"
- If calling after hours: "We're closed right now, but I can take your information and have someone call you back first thing when we open. What's your name and best number?"
- If they're upset or frustrated: Stay calm, empathize, never argue. "I completely understand — let me make sure we take care of this for you."

## WHAT YOU NEVER DO
- Never diagnose mechanical problems — you are not a technician
- Never guarantee repair times or costs
- Never offer discounts or negotiate prices
- Never argue with the customer
- Never say "I'm an AI" unless directly asked`;

// ─── First Message (Greeting) ─────────────────────────────────────────────────
// This is what the agent says the moment the call connects.
// It should be warm, identify the agent by name, and then PAUSE.
const FIRST_MESSAGE = `Thanks for calling — this is Sam with Baylio Auto Repair. How can I help you today?`;

// ─── Patch the Agent ─────────────────────────────────────────────────────────
const payload = {
  name: "Baylio — Sam (Service Advisor)",
  conversation_config: {
    agent: {
      prompt: {
        prompt: SYSTEM_PROMPT,
      },
      first_message: FIRST_MESSAGE,
      language: "en",
    },
    tts: {
      // Keep existing voice — cjVigY5qzO86Huf0OWal
      voice_id: "cjVigY5qzO86Huf0OWal",
    },
    turn: {
      turn_timeout: 10,           // Wait 10s for customer to speak before timing out
      initial_wait_time: 2,       // Wait 2 seconds after greeting before listening (gives customer time to process)
      silence_end_call_timeout: 30, // End call after 30s of total silence
      mode: "turn",
      turn_eagerness: "patient",  // Don't jump in too quickly
    },
  },
};

console.log("Updating ElevenLabs agent:", AGENT_ID);
console.log("First message:", FIRST_MESSAGE);
console.log("Prompt length:", SYSTEM_PROMPT.length, "chars");

const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
  method: "PATCH",
  headers: {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const result = await response.json();

if (!response.ok) {
  console.error("❌ Failed to update agent:", JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("✅ Agent updated successfully!");
console.log("Agent ID:", result.agent_id || AGENT_ID);

// Verify by fetching the updated config
const verify = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
  headers: { "xi-api-key": API_KEY },
});
const verified = await verify.json();
const agent = verified.conversation_config?.agent || {};
console.log("\n=== VERIFIED CONFIG ===");
console.log("First message:", agent.first_message);
console.log("Prompt (first 100 chars):", (agent.prompt?.prompt || "").substring(0, 100));
console.log("Language:", agent.language);
console.log("Turn config:", JSON.stringify(verified.conversation_config?.turn, null, 2));
