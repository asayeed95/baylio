import { describe, it, expect } from "vitest";

describe("Sales Line Environment Variables", () => {
  it("should have ELEVENLABS_AGENT_ID configured", () => {
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    expect(agentId).toBeDefined();
    expect(agentId).not.toBe("");
    expect(agentId).toMatch(/^agent_/);
  });

  it("should have BAYLIO_SALES_PHONE configured in E.164 format", () => {
    const phone = process.env.BAYLIO_SALES_PHONE;
    expect(phone).toBeDefined();
    expect(phone).not.toBe("");
    expect(phone).toMatch(/^\+1\d{10}$/);
  });

  it("should have ELEVENLABS_API_KEY configured", () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
  });

  it("should validate ElevenLabs agent exists via API", async () => {
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!agentId || !apiKey) {
      console.warn("Skipping live API test — credentials not available");
      return;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${agentId}`,
      {
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.agent_id).toBe(agentId);
  });
});
