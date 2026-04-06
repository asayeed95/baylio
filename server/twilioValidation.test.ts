import { describe, it, expect } from "vitest";
import { computeExpectedSignature, timingSafeCompare } from "./middleware/twilioValidation";

describe("Twilio Webhook Validation", () => {
  const testToken = "test_auth_token_32chars_xxxxxxxx";
  const testUrl = "https://baylio.io/api/twilio/voice";

  it("computeExpectedSignature generates a valid HMAC-SHA1 signature", () => {
    const params = {
      CallSid: "CAtestvalidation123",
      CallStatus: "ringing",
      From: "+15551234567",
      To: "+18448752441",
    };

    const sig = computeExpectedSignature(testToken, testUrl, params);
    expect(sig).toBeTruthy();
    expect(typeof sig).toBe("string");
    // Base64 encoded SHA1 HMAC should be 28 chars
    expect(sig.length).toBe(28);
  });

  it("same inputs produce same signature", () => {
    const params = { CallSid: "CA123" };
    const sig1 = computeExpectedSignature(testToken, testUrl, params);
    const sig2 = computeExpectedSignature(testToken, testUrl, params);
    expect(sig1).toBe(sig2);
  });

  it("different tokens produce different signatures", () => {
    const params = { CallSid: "CA123" };
    const sig1 = computeExpectedSignature(testToken, testUrl, params);
    const sig2 = computeExpectedSignature("different_token_xxxxxxxxxxxxx", testUrl, params);
    expect(sig1).not.toBe(sig2);
  });

  it("timingSafeCompare returns true for equal strings", () => {
    expect(timingSafeCompare("abc123", "abc123")).toBe(true);
  });

  it("timingSafeCompare returns false for different strings", () => {
    expect(timingSafeCompare("abc123", "abc124")).toBe(false);
  });

  it("timingSafeCompare returns false for different lengths", () => {
    expect(timingSafeCompare("short", "much longer string")).toBe(false);
  });
});
