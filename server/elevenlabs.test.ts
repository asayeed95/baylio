import { describe, it, expect } from "vitest";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const AGENT_ID = "agent_8401kkzx0edafhbb0c56a04d1kmb";

describe("ElevenLabs API Validation", () => {
  it("should have ELEVENLABS_API_KEY set", () => {
    expect(ELEVENLABS_API_KEY).not.toBe("");
    expect(ELEVENLABS_API_KEY.length).toBeGreaterThan(10);
  });

  it("should validate API key against ElevenLabs user endpoint", async () => {
    const res = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("subscription");
  });

  it("should register a test call and receive valid TwiML", async () => {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: AGENT_ID,
          from_number: "+15551234567",
          to_number: "+18448752441",
          direction: "inbound",
        }),
      }
    );
    expect(res.status).toBe(200);
    const twiml = await res.text();
    expect(twiml).toContain("<?xml");
    expect(twiml).toContain("<Response>");
    expect(twiml).toContain("<Connect>");
    expect(twiml).toContain("<Stream");
    expect(twiml).toContain("conversation_id");
  });
});
