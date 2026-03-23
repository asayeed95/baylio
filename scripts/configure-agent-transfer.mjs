/**
 * Configure Alex → Ranvir mid-call transfer via ElevenLabs built-in tool.
 *
 * This enables the `transfer_to_agent` tool on Alex's agent so callers
 * requesting tech support, setup help, or billing are handed off to Ranvir.
 *
 * Run: ELEVENLABS_API_KEY=<key> node scripts/configure-agent-transfer.mjs
 */

const API_KEY = process.env.ELEVENLABS_API_KEY;
const ALEX_AGENT_ID = "agent_8401kkzx0edafhbb0c56a04d1kmb";
const RANVIR_AGENT_ID = "agent_7401kmdv1dbff0fr6cv04c256tbf";

if (!API_KEY) {
  console.error("Missing ELEVENLABS_API_KEY");
  process.exit(1);
}

const TRANSFER_TRIGGERS = [
  "tech support",
  "not working",
  "setup help",
  "billing issue",
  "configure",
  "integration",
  "technical problem",
  "troubleshooting",
];

const TRANSFER_PROMPT_ADDITION = `

## TRANSFER TO RANVIR (Tech Support)
When the caller mentions any of these topics: ${TRANSFER_TRIGGERS.join(", ")} —
you MUST transfer them to Ranvir, the tech support specialist.

Say: "Let me get Ranvir on the line for you — one moment!"
Then immediately use the transfer_to_agent tool. Do NOT continue the conversation after initiating the transfer.
`;

// Step 1: Fetch current agent config to preserve existing prompt
console.log(`Fetching current config for Alex (${ALEX_AGENT_ID})...`);
const current = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${ALEX_AGENT_ID}`,
  { headers: { "xi-api-key": API_KEY } }
);

if (!current.ok) {
  console.error("Failed to fetch agent:", await current.text());
  process.exit(1);
}

const currentConfig = await current.json();
const existingPrompt =
  currentConfig.conversation_config?.agent?.prompt?.prompt || "";

// Only append transfer instructions if not already present
const needsUpdate = !existingPrompt.includes("TRANSFER TO RANVIR");
const updatedPrompt = needsUpdate
  ? existingPrompt + TRANSFER_PROMPT_ADDITION
  : existingPrompt;

// Step 2: Patch agent with transfer tool + updated prompt
const payload = {
  conversation_config: {
    agent: {
      prompt: {
        prompt: updatedPrompt,
        built_in_tools: [
          {
            type: "system",
            name: "transfer_to_agent",
            params: {
              system_tool_type: "transfer_to_agent",
              agent_id: RANVIR_AGENT_ID,
            },
          },
        ],
      },
    },
  },
};

console.log("Patching Alex with transfer_to_agent tool...");
console.log(`  Target agent: Ranvir (${RANVIR_AGENT_ID})`);
console.log(`  Prompt updated: ${needsUpdate ? "yes" : "no (already contains transfer instructions)"}`);

const response = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${ALEX_AGENT_ID}`,
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
  console.error("Failed to update agent:", JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log("Agent updated successfully!");

// Step 3: Verify
const verify = await fetch(
  `https://api.elevenlabs.io/v1/convai/agents/${ALEX_AGENT_ID}`,
  { headers: { "xi-api-key": API_KEY } }
);
const verified = await verify.json();
const tools =
  verified.conversation_config?.agent?.prompt?.built_in_tools || [];
const hasTransfer = tools.some((t) => t.name === "transfer_to_agent");

console.log("\n=== VERIFICATION ===");
console.log("Transfer tool enabled:", hasTransfer);
console.log(
  "Transfer target:",
  tools.find((t) => t.name === "transfer_to_agent")?.params?.agent_id || "N/A"
);
console.log(
  "Prompt includes transfer instructions:",
  verified.conversation_config?.agent?.prompt?.prompt?.includes(
    "TRANSFER TO RANVIR"
  ) || false
);

if (!hasTransfer) {
  console.error("VERIFICATION FAILED — transfer tool not found on agent");
  process.exit(1);
}

console.log("\nDone. Alex can now transfer calls to Ranvir.");
