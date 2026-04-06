import { describe, it, expect } from "vitest";

describe("Supabase configuration", () => {
  it("SUPABASE_URL is a valid Supabase URL when set", () => {
    const url = process.env.SUPABASE_URL;
    if (!url) return; // Skip in CI without credentials
    expect(url).toContain("supabase.co");
    expect(url).toMatch(/^https:\/\//);
  });

  it("SUPABASE_ANON_KEY is non-empty when set", () => {
    const key = process.env.SUPABASE_ANON_KEY;
    if (!key) return; // Skip in CI without credentials
    expect(key.length).toBeGreaterThan(20);
  });

  it("DATABASE_URL contains postgres when set", () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return; // Skip in CI without credentials
    expect(dbUrl).toMatch(/postgres/);
  });

  it("all three Supabase vars must be set together or all unset", () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    const db = process.env.DATABASE_URL;
    const allSet = !!(url && key && db);
    const noneSet = !url && !key && !db;
    expect(allSet || noneSet).toBe(true);
  });
});
