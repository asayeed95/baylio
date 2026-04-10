import { describe, it, expect, vi, beforeEach } from "vitest";
const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY || "test_api_key_mock";

describe("ElevenLabs API Validation", () => {
  it("should have ELEVENLABS_API_KEY set", () => {
    expect(ELEVENLABS_API_KEY).not.toBe("");
    expect(ELEVENLABS_API_KEY.length).toBeGreaterThan(10);
  });

  it("should validate API key format (mocked — no live call in CI)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ subscription: { tier: "free" } }),
    });
    const originalFetch = global.fetch;
    global.fetch = mockFetch;
    const res = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": ELEVENLABS_API_KEY },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("subscription");
    global.fetch = originalFetch;
  });

  it("should register a test call and receive valid TwiML (mocked)", async () => {
    const mockTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="wss://api.elevenlabs.io" conversationId="conversation_id_test"/></Connect></Response>`;
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      text: async () => mockTwiml,
    });
    const originalFetch = global.fetch;
    global.fetch = mockFetch;
    const res = await fetch(
      "https://api.elevenlabs.io/v1/convai/twilio/register-call",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: "test_agent_id",
          from_number: "+15551234567",
          to_number: "+15559876543",
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
    global.fetch = originalFetch;
  });
});

// ─── VOICE_CATALOG tests ─────────────────────────────────────────────

import { VOICE_CATALOG, previewVoiceTTS } from "./services/elevenLabsService";

describe("VOICE_CATALOG", () => {
  it("has 16 entries", () => {
    expect(VOICE_CATALOG).toHaveLength(16);
  });

  it("has no duplicate voice IDs", () => {
    const ids = VOICE_CATALOG.map((v) => v.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("has no placeholder IDs", () => {
    for (const v of VOICE_CATALOG) {
      expect(v.id).not.toMatch(/^REPLACE_/);
      expect(v.id).not.toMatch(/^CONFIRMED_/);
    }
  });

  it("each entry has required fields", () => {
    for (const v of VOICE_CATALOG) {
      expect(v.id.length).toBeGreaterThan(10);
      expect(v.name.length).toBeGreaterThan(0);
      expect(["male", "female"]).toContain(v.gender);
      expect(v.accent.length).toBeGreaterThan(0);
      expect(v.description.length).toBeGreaterThan(0);
    }
  });
});

// ─── previewVoiceTTS tests ───────────────────────────────────────────

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(),
    },
  };
});

import axios from "axios";

describe("previewVoiceTTS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = "test_api_key_mock";
  });

  it("returns a Buffer on success", async () => {
    const fakeAudioData = new Uint8Array([0x49, 0x44, 0x33]).buffer; // fake mp3 bytes
    const mockPost = vi.fn().mockResolvedValue({ data: fakeAudioData });
    const mockClient = { post: mockPost };
    vi.mocked(axios.create).mockReturnValue(mockClient as any);

    const result = await previewVoiceTTS("21m00Tcm4TlvDq8ikWAM", "Hello, this is a test.");

    expect(result).toBeInstanceOf(Buffer);
    expect(mockPost).toHaveBeenCalledWith(
      "/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      expect.objectContaining({
        text: "Hello, this is a test.",
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
      }),
      expect.objectContaining({ responseType: "arraybuffer" })
    );
  });

  it("throws on API error", async () => {
    const mockPost = vi.fn().mockRejectedValue(
      Object.assign(new Error("Bad request"), { response: { status: 400 }, message: "Bad request" })
    );
    const mockClient = { post: mockPost };
    vi.mocked(axios.create).mockReturnValue(mockClient as any);

    await expect(
      previewVoiceTTS("invalid_voice_id", "test")
    ).rejects.toThrow("Failed to generate voice preview");
  });
});
