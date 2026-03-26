import { describe, it, expect } from "vitest";

/**
 * Supabase credential validation tests.
 * These tests verify that the Supabase project is reachable and credentials are valid.
 * They run against the live Supabase project: unpdaeldrshraaxdjkly
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://unpdaeldrshraaxdjkly.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";

describe("Supabase credentials", () => {
  it("should have SUPABASE_URL set", () => {
    expect(SUPABASE_URL).toBeTruthy();
    expect(SUPABASE_URL).toContain("supabase.co");
  });

  it("should have SUPABASE_ANON_KEY set", () => {
    expect(SUPABASE_ANON_KEY).toBeTruthy();
    expect(SUPABASE_ANON_KEY.length).toBeGreaterThan(20);
  });

  it("should have SUPABASE_DATABASE_URL set", () => {
    const dbUrl = process.env.SUPABASE_DATABASE_URL ?? "";
    expect(dbUrl).toBeTruthy();
    expect(dbUrl).toContain("supabase");
  });

  it("should reach Supabase Auth API", async () => {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    // 200 = valid credentials, 401 = wrong key
    expect(resp.status).toBe(200);
    const data = await resp.json() as Record<string, unknown>;
    expect(data).toHaveProperty("external");
  }, 15000);
});
