/**
 * registerElevenLabsCall Tests
 *
 * Covers LOOP-014 gap #4: the core function that bridges Twilio → ElevenLabs
 * live-call flow. This is the last line between the caller and the AI agent;
 * a regression here means callers hit dead air.
 *
 * Verifies:
 *   1. POSTs to /v1/convai/twilio/register-call
 *   2. Sends xi-api-key header from ENV.elevenLabsApiKey
 *   3. Request body includes agent_id, from_number, to_number, direction=inbound
 *   4. Optional conversation_initiation_client_data is passed through
 *   5. Returns the TwiML response body verbatim on success
 *   6. Throws with status code and error text on non-2xx response
 *   7. AbortController cancels request after 3s timeout
 *   8. Dynamic variables (if passed) land in conversation_initiation_client_data
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("registerElevenLabsCall", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalEnv = process.env.ELEVENLABS_API_KEY;

  beforeEach(() => {
    process.env.ELEVENLABS_API_KEY = "test-xi-key";
    fetchSpy = vi.fn();
    // @ts-expect-error — overriding global fetch for the test
    global.fetch = fetchSpy;
    vi.resetModules();
  });

  afterEach(() => {
    process.env.ELEVENLABS_API_KEY = originalEnv;
    vi.useRealTimers();
  });

  async function loadFn() {
    const mod = await import("./twilioWebhooks");
    return mod.registerElevenLabsCall;
  }

  function okResponse(body: string): Response {
    return {
      ok: true,
      status: 200,
      text: async () => body,
    } as Response;
  }

  function errResponse(status: number, body: string): Response {
    return {
      ok: false,
      status,
      text: async () => body,
    } as Response;
  }

  it("POSTs to the ElevenLabs Register Call endpoint", async () => {
    fetchSpy.mockResolvedValue(okResponse("<Response/>"));
    const fn = await loadFn();
    await fn("agent_123", "+15551112222", "+18624162966");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.elevenlabs.io/v1/convai/twilio/register-call");
    expect(opts.method).toBe("POST");
  });

  it("sends xi-api-key header from ENV.elevenLabsApiKey", async () => {
    fetchSpy.mockResolvedValue(okResponse("<Response/>"));
    const fn = await loadFn();
    await fn("agent_123", "+15551112222", "+18624162966");
    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.headers["xi-api-key"]).toBe("test-xi-key");
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });

  it("includes agent_id, from_number, to_number, direction=inbound in body", async () => {
    fetchSpy.mockResolvedValue(okResponse("<Response/>"));
    const fn = await loadFn();
    await fn("agent_abc", "+15551112222", "+18624162966");
    const [, opts] = fetchSpy.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body).toMatchObject({
      agent_id: "agent_abc",
      from_number: "+15551112222",
      to_number: "+18624162966",
      direction: "inbound",
    });
  });

  it("omits conversation_initiation_client_data when no init data is given", async () => {
    fetchSpy.mockResolvedValue(okResponse("<Response/>"));
    const fn = await loadFn();
    await fn("agent_123", "+15551112222", "+18624162966");
    const [, opts] = fetchSpy.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.conversation_initiation_client_data).toBeUndefined();
  });

  it("passes dynamic_variables through conversation_initiation_client_data", async () => {
    fetchSpy.mockResolvedValue(okResponse("<Response/>"));
    const fn = await loadFn();
    await fn("agent_123", "+15551112222", "+18624162966", {
      dynamic_variables: {
        caller_name: "Jane",
        shop_name: "Joe's Auto",
      },
    });
    const [, opts] = fetchSpy.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.conversation_initiation_client_data).toEqual({
      dynamic_variables: {
        caller_name: "Jane",
        shop_name: "Joe's Auto",
      },
    });
  });

  it("returns the TwiML response body verbatim on 200", async () => {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Connect><Stream url="wss://..."/></Connect></Response>`;
    fetchSpy.mockResolvedValue(okResponse(twiml));
    const fn = await loadFn();
    const result = await fn("agent_123", "+15551112222", "+18624162966");
    expect(result).toBe(twiml);
  });

  it("throws an error with status code when ElevenLabs returns non-2xx", async () => {
    fetchSpy.mockResolvedValue(errResponse(401, "Unauthorized: invalid API key"));
    const fn = await loadFn();
    await expect(
      fn("agent_123", "+15551112222", "+18624162966")
    ).rejects.toThrow(/401/);
    await expect(
      fn("agent_123", "+15551112222", "+18624162966")
    ).rejects.toThrow(/Unauthorized/);
  });

  it("surfaces 4xx error body so the caller can debug", async () => {
    fetchSpy.mockResolvedValue(errResponse(404, "Agent not found"));
    const fn = await loadFn();
    await expect(
      fn("agent_missing", "+15551112222", "+18624162966")
    ).rejects.toThrow(/Agent not found/);
  });

  it("surfaces 5xx server errors", async () => {
    fetchSpy.mockResolvedValue(errResponse(503, "Service unavailable"));
    const fn = await loadFn();
    await expect(
      fn("agent_123", "+15551112222", "+18624162966")
    ).rejects.toThrow(/503/);
  });

  it("passes an AbortSignal to fetch so the request can time out", async () => {
    fetchSpy.mockResolvedValue(okResponse("<Response/>"));
    const fn = await loadFn();
    await fn("agent_123", "+15551112222", "+18624162966");
    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.signal).toBeInstanceOf(AbortSignal);
  });

  it("aborts the fetch after 3s if it has not completed", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    fetchSpy.mockImplementation((_url: string, opts: RequestInit) => {
      capturedSignal = opts.signal as AbortSignal;
      return new Promise((resolve, reject) => {
        opts.signal?.addEventListener("abort", () => {
          reject(new Error("aborted"));
        });
      });
    });

    const fn = await loadFn();
    const promise = fn("agent_123", "+15551112222", "+18624162966");
    // Swallow the rejection so Vitest doesn't flag unhandled rejection
    promise.catch(() => {});

    // Fire the 3s timeout
    vi.advanceTimersByTime(3001);
    await Promise.resolve();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
