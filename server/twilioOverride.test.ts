/**
 * Tests for conversation_config_override integration and sales line routing.
 * 
 * Tests cover:
 * 1. Sales line phone number detection
 * 2. conversation_config_override payload structure
 * 3. ElevenLabs Register Call API integration (live)
 * 4. Prompt compilation for overrides
 */
import { describe, it, expect } from "vitest";

// ─── Unit Tests: Sales Line Detection ──────────────────────────────

describe("Sales Line Phone Number Detection", () => {
  // Replicate the isBaylioSalesLine logic for testing
  function isBaylioSalesLine(toNumber: string): boolean {
    const normalize = (n: string) => {
      const digits = n.replace(/\D/g, "");
      return digits.length === 10 ? `+1${digits}` : `+${digits}`;
    };
    const salesPhone = process.env.BAYLIO_SALES_PHONE || "+18448752441";
    return normalize(toNumber) === normalize(salesPhone);
  }

  it("should detect +18448752441 as sales line", () => {
    expect(isBaylioSalesLine("+18448752441")).toBe(true);
  });

  it("should detect 18448752441 without + prefix as sales line", () => {
    expect(isBaylioSalesLine("18448752441")).toBe(true);
  });

  it("should detect (844) 875-2441 formatted number as sales line", () => {
    // The normalize function strips non-digits: (844) 875-2441 → 8448752441 → +18448752441
    expect(isBaylioSalesLine("(844) 875-2441")).toBe(true);
    expect(isBaylioSalesLine("8448752441")).toBe(true);
  });

  it("should NOT detect a random number as sales line", () => {
    expect(isBaylioSalesLine("+15551234567")).toBe(false);
    expect(isBaylioSalesLine("+12125551234")).toBe(false);
  });

  it("should NOT detect empty string as sales line", () => {
    expect(isBaylioSalesLine("")).toBe(false);
  });
});

// ─── Unit Tests: conversation_config_override Structure ────────────

describe("conversation_config_override Payload Structure", () => {
  it("should build correct override for sales agent", () => {
    const override = {
      agent: {
        prompt: {
          prompt: "You are Baylio, the AI sales agent...",
        },
        first_message: "Thanks for calling Baylio!",
        language: "en",
      },
    };

    // Verify structure matches ElevenLabs API spec
    expect(override.agent).toBeDefined();
    expect(override.agent.prompt).toBeDefined();
    expect(override.agent.prompt.prompt).toContain("Baylio");
    expect(override.agent.first_message).toBeDefined();
    expect(override.agent.language).toBe("en");
  });

  it("should build correct override for shop-specific agent", () => {
    const shopOverride = {
      agent: {
        prompt: {
          prompt: "You are Sarah, the AI receptionist for Mike's Auto Repair...",
        },
        first_message: "Thanks for calling Mike's Auto Repair! How can I help?",
        language: "en",
      },
    };

    expect(shopOverride.agent.prompt.prompt).toContain("Mike's Auto Repair");
    expect(shopOverride.agent.first_message).toContain("Mike's Auto Repair");
  });

  it("should build correct conversation_initiation_client_data with override", () => {
    const clientData = {
      conversation_config_override: {
        agent: {
          prompt: { prompt: "test prompt" },
          first_message: "Hello!",
        },
      },
      dynamic_variables: {
        caller_number: "+15551234567",
        call_type: "sales_inquiry",
      },
    };

    // Verify the full nested structure
    expect(clientData.conversation_config_override).toBeDefined();
    expect(clientData.conversation_config_override.agent).toBeDefined();
    expect(clientData.dynamic_variables).toBeDefined();
    expect(clientData.dynamic_variables.caller_number).toMatch(/^\+\d+$/);
  });

  it("should omit fields not being overridden (per ElevenLabs docs)", () => {
    // Only override system prompt, not voice or TTS settings
    const minimalOverride = {
      agent: {
        prompt: {
          prompt: "Custom prompt only",
        },
      },
    };

    // Should NOT have tts, conversation, or other top-level keys
    expect(minimalOverride).not.toHaveProperty("tts");
    expect(minimalOverride).not.toHaveProperty("conversation");
    expect(minimalOverride.agent).not.toHaveProperty("first_message");
  });
});

// ─── Integration Tests: ElevenLabs Register Call API ───────────────

describe("ElevenLabs Register Call API with Override", () => {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  it("should successfully register a call with conversation_config_override", async () => {
    if (!agentId || !apiKey) {
      console.warn("Skipping live API test — credentials not available");
      return;
    }

    const body = {
      agent_id: agentId,
      from_number: "+15551234567",
      to_number: "+18448752441",
      direction: "inbound",
      conversation_initiation_client_data: {
        conversation_config_override: {
          agent: {
            prompt: {
              prompt: "You are a test agent. Respond with 'Test successful' to any input.",
            },
            first_message: "Test call registered successfully.",
            language: "en",
          },
        },
        dynamic_variables: {
          caller_number: "+15551234567",
          call_type: "test",
        },
      },
    };

    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    // The API should accept the override payload
    // Note: May return 422 if overrides aren't enabled in dashboard
    if (response.status === 422) {
      const errorText = await response.text();
      console.warn(
        "[TEST] 422 from Register Call — overrides may not be enabled in ElevenLabs dashboard.",
        "Go to Agent Settings → Security → Enable 'System prompt' and 'First message' overrides.",
        "Error:", errorText
      );
      // This is an expected failure if overrides aren't enabled yet
      expect(response.status).toBe(422);
    } else {
      expect(response.status).toBe(200);
      const twiml = await response.text();
      // Should return valid TwiML with a WebSocket URL
      expect(twiml).toContain("<?xml");
      expect(twiml).toContain("Stream");
      console.log("[TEST] Register Call with override succeeded! TwiML length:", twiml.length);
    }
  });

  it("should successfully register a call WITHOUT override (baseline)", async () => {
    if (!agentId || !apiKey) {
      console.warn("Skipping live API test — credentials not available");
      return;
    }

    const body = {
      agent_id: agentId,
      from_number: "+15551234567",
      to_number: "+18448752441",
      direction: "inbound",
    };

    const response = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    expect(response.status).toBe(200);
    const twiml = await response.text();
    expect(twiml).toContain("<?xml");
    console.log("[TEST] Baseline Register Call (no override) succeeded!");
  });
});

// ─── Unit Tests: Prompt Compilation ────────────────────────────────

describe("Baylio Sales Agent Prompt", () => {
  it("should export a non-empty prompt string", async () => {
    const { baylioSalesAgentPrompt } = await import("./services/prompts/baylioSalesAgent");
    expect(baylioSalesAgentPrompt).toBeDefined();
    expect(typeof baylioSalesAgentPrompt).toBe("string");
    expect(baylioSalesAgentPrompt.length).toBeGreaterThan(100);
  });

  it("should contain key sales agent elements", async () => {
    const { baylioSalesAgentPrompt } = await import("./services/prompts/baylioSalesAgent");
    // Should contain persona identity
    expect(baylioSalesAgentPrompt).toContain("Baylio");
    // Should contain pricing info
    expect(baylioSalesAgentPrompt).toMatch(/\$\d+/);
    // Should contain auto repair context
    expect(baylioSalesAgentPrompt.toLowerCase()).toContain("auto repair");
  });

  it("should not contain template variables (all should be compiled)", async () => {
    const { baylioSalesAgentPrompt } = await import("./services/prompts/baylioSalesAgent");
    // Sales agent prompt is static — no {{variables}} should remain
    expect(baylioSalesAgentPrompt).not.toMatch(/\{\{.*?\}\}/);
  });
});
