import { describe, it, expect } from "vitest";

const hasTwilioCreds = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

describe("Twilio configuration", () => {
  it("TWILIO_ACCOUNT_SID starts with AC and is 34 chars when set", () => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    if (!sid) return; // Skip without credentials
    expect(sid.startsWith("AC")).toBe(true);
    expect(sid.length).toBe(34);
  });

  it("TWILIO_AUTH_TOKEN is a 32-char hex string when set", () => {
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!token) return; // Skip without credentials
    expect(token.length).toBe(32);
    expect(/^[a-f0-9]{32}$/.test(token)).toBe(true);
  });

  it("TWILIO_PHONE_NUMBER starts with + when set", () => {
    const phone = process.env.TWILIO_PHONE_NUMBER;
    if (!phone) return;
    expect(phone.startsWith("+")).toBe(true);
  });

  it.skipIf(!hasTwilioCreds)("validates credentials against Twilio API", async () => {
    const { validateTwilioCredentials } = await import("./services/twilioProvisioning");
    const result = await validateTwilioCredentials();
    expect(result.accountSid).toBeTruthy();
    expect(result.status).toBe("active");
  }, 15000);

  it.skipIf(!hasTwilioCreds)("fetches account balance", async () => {
    const { getAccountBalance } = await import("./services/twilioProvisioning");
    const balance = await getAccountBalance();
    expect(balance.currency).toBe("USD");
  }, 15000);
});
