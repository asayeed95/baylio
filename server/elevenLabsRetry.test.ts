import { describe, expect, it, vi } from "vitest";
import { withRetry } from "./services/elevenLabsService";

/**
 * ElevenLabs Retry Logic Tests
 */
describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, 3, "test");
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValue("ok after retry");

    const result = await withRetry(fn, 3, "test");
    expect(result).toBe("ok after retry");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 500 and succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockResolvedValue("ok");

    const result = await withRetry(fn, 3, "test");
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws immediately on 4xx (non-429)", async () => {
    const fn = vi.fn().mockRejectedValue({ response: { status: 401 } });
    await expect(withRetry(fn, 3, "test")).rejects.toEqual({ response: { status: 401 } });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after max retries exhausted", async () => {
    const fn = vi.fn().mockRejectedValue({ response: { status: 429 } });
    await expect(withRetry(fn, 2, "test")).rejects.toEqual({ response: { status: 429 } });
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("throws on non-HTTP errors without retrying", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Network error"));
    await expect(withRetry(fn, 3, "test")).rejects.toThrow("Network error");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
