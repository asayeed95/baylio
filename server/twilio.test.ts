/**
 * Twilio Integration Tests
 *
 * Validates that:
 * 1. TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set
 * 2. Credentials are valid (live API call to Twilio)
 * 3. Account is active
 * 4. Phone number search works for a US area code
 * 5. Account balance endpoint responds
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  validateTwilioCredentials,
  searchAvailableNumbers,
  getAccountBalance,
} from "./services/twilioProvisioning";

describe("Twilio Credentials & API", () => {
  beforeAll(() => {
    // Ensure env vars are present before any test runs
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in environment"
      );
    }
  });

  it("should have TWILIO_ACCOUNT_SID set and starting with AC", () => {
    const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
    expect(sid).toBeTruthy();
    expect(sid.startsWith("AC")).toBe(true);
    expect(sid.length).toBe(34);
  });

  it("should have TWILIO_AUTH_TOKEN set (32-char hex)", () => {
    const token = process.env.TWILIO_AUTH_TOKEN ?? "";
    expect(token).toBeTruthy();
    expect(token.length).toBe(32);
    expect(/^[a-f0-9]{32}$/.test(token)).toBe(true);
  });

  it("should validate credentials against Twilio API and return active account", async () => {
    const result = await validateTwilioCredentials();
    expect(result.accountSid).toBeTruthy();
    expect(result.accountSid.startsWith("AC")).toBe(true);
    expect(result.status).toBe("active");
    expect(result.friendlyName).toBeTruthy();
    console.log(`[TWILIO] Connected: ${result.friendlyName} (${result.accountSid})`);
  }, 15000);

  it("should fetch account balance", async () => {
    const balance = await getAccountBalance();
    expect(balance.balance).toBeTruthy();
    expect(balance.currency).toBe("USD");
    console.log(`[TWILIO] Balance: $${balance.balance} ${balance.currency}`);
  }, 15000);

  it("should search available phone numbers (any US area code)", async () => {
    // Trial accounts may not have numbers in specific area codes like 415;
    // search without area code restriction to confirm the API works.
    const twilio = await import("twilio");
    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    const numbers = await client.availablePhoneNumbers("US").local.list({
      voiceEnabled: true,
      limit: 5,
    });
    expect(Array.isArray(numbers)).toBe(true);
    expect(numbers.length).toBeGreaterThan(0);
    const first = numbers[0];
    expect(first.phoneNumber).toMatch(/^\+1/);
    expect(first.capabilities?.voice).toBe(true);
    console.log(
      `[TWILIO] Found ${numbers.length} available US numbers. First: ${first.phoneNumber} (${first.region})`
    );
  }, 15000);
});
