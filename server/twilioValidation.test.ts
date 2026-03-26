import { describe, it, expect } from "vitest";
import twilio from "twilio";

describe("Twilio Webhook Validation", () => {
  it("WEBHOOK_BASE_URL is configured", () => {
    const url = process.env.WEBHOOK_BASE_URL;
    expect(url).toBeDefined();
    expect(url).toMatch(/^https?:\/\//);
    expect(url).not.toContain("/api"); // should be base URL only
  });

  it("TWILIO_AUTH_TOKEN is configured", () => {
    const token = process.env.TWILIO_AUTH_TOKEN;
    expect(token).toBeDefined();
    expect(token!.length).toBeGreaterThan(10);
  });

  it("Twilio SDK validateRequest works with WEBHOOK_BASE_URL", () => {
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const baseUrl = process.env.WEBHOOK_BASE_URL!;
    const fullUrl = `${baseUrl}/api/twilio/voice`;

    const params = {
      CallSid: "CAtestvalidation123",
      CallStatus: "ringing",
      From: "+15551234567",
      To: "+18448752441",
    };

    // Generate a valid signature using the SDK
    // This proves that if Twilio signs for this URL, our validation will pass
    const crypto = require("crypto");
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + (params as any)[key], fullUrl);
    const expectedSig = crypto
      .createHmac("sha1", authToken)
      .update(Buffer.from(data, "utf-8"))
      .digest("base64");

    // Validate using Twilio's official SDK
    const isValid = twilio.validateRequest(authToken, expectedSig, fullUrl, params);
    expect(isValid).toBe(true);
  });

  it("rejects invalid signatures", () => {
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const baseUrl = process.env.WEBHOOK_BASE_URL!;
    const fullUrl = `${baseUrl}/api/twilio/voice`;

    const params = { CallSid: "CAtestinvalid" };
    const isValid = twilio.validateRequest(authToken, "invalidSignature123", fullUrl, params);
    expect(isValid).toBe(false);
  });
});
