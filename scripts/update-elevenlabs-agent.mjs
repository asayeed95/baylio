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

const SYSTEM_PROMPT = `{{baylio_system_prompt}}`;

// ─── First Message (Greeting) ─────────────────────────────────────────────────
// This is what the agent says the moment the call connects.
const FIRST_MESSAGE = `{{baylio_greeting}}`;

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
      turn_timeout: 10, // Wait 10s for customer to speak before timing out
      initial_wait_time: 2, // Wait 2 seconds after greeting before listening (gives customer time to process)
      silence_end_call_timeout: 30, // End call after 30s of total silence
      mode: "turn",
      turn_eagerness: "patient", // Don't jump in too quickly
    },
  },
};

console.log("Updating ElevenLabs agent:", AGENT_ID);
console.log("First message:", FIRST_MESSAGE);
console.log("Prompt length:", SYSTEM_PROMPT.length, "chars");

const response = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
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
  console.error("❌ Failed to update agent:", JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("✅ Agent updated successfully!");
console.log("Agent ID:", result.agent_id || AGENT_ID);

// Verify by fetching the updated config
const verify = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
  {
    headers: { "xi-api-key": API_KEY },
  }
);
const verified = await verify.json();
const agent = verified.conversation_config?.agent || {};
console.log("\n=== VERIFIED CONFIG ===");
console.log("First message:", agent.first_message);
console.log(
  "Prompt (first 100 chars):",
  (agent.prompt?.prompt || "").substring(0, 100)
);
console.log("Language:", agent.language);
console.log(
  "Turn config:",
  JSON.stringify(verified.conversation_config?.turn, null, 2)
);
