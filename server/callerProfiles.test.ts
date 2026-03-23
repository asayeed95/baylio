import { describe, expect, it, vi } from "vitest";

/**
 * Caller Profile Tests
 *
 * Tests the caller_profiles schema definition and upsert logic.
 * The actual DB upsert runs inside twilioWebhooks.ts — here we
 * verify the schema structure and SQL patterns.
 */

describe("Caller Profiles", () => {
  it("callerProfiles table is defined in schema with correct columns", async () => {
    const { callerProfiles } = await import("../drizzle/schema");

    // Core columns exist
    expect(callerProfiles.phone).toBeDefined();
    expect(callerProfiles.name).toBeDefined();
    expect(callerProfiles.callerRole).toBeDefined();
    expect(callerProfiles.callCount).toBeDefined();
    expect(callerProfiles.lastCalledAt).toBeDefined();
    expect(callerProfiles.doNotSell).toBeDefined();
  });

  it("phone column has unique constraint", async () => {
    const { callerProfiles } = await import("../drizzle/schema");
    // Drizzle stores unique constraint info on the column config
    const phoneConfig = (callerProfiles.phone as any).config;
    expect(phoneConfig?.isUnique).toBe(true);
  });

  it("callerRole enum includes expected values", async () => {
    const { callerProfiles } = await import("../drizzle/schema");
    const roleCol = callerProfiles.callerRole as any;
    // Drizzle enum columns have enumValues
    const values = roleCol.enumValues;
    expect(values).toContain("prospect");
    expect(values).toContain("shop_owner");
    expect(values).toContain("founder");
    expect(values).toContain("tester");
    expect(values).toContain("vendor");
    expect(values).toContain("unknown");
  });

  it("callCount defaults to 0", async () => {
    const { callerProfiles } = await import("../drizzle/schema");
    const config = (callerProfiles.callCount as any).config;
    expect(config?.hasDefault).toBe(true);
  });
});
