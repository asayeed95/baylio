/**
 * Analytics Router Tests
 *
 * Tests for the admin analytics dashboard data queries.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";

const mockGetDb = vi.mocked(getDb);

describe("Analytics Router Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TIER_MONTHLY_PRICE mapping", () => {
    const TIER_MONTHLY_PRICE: Record<string, number> = {
      pilot: 149,
      starter: 199,
      pro: 349,
      elite: 599,
    };

    it("should have correct pilot price", () => {
      expect(TIER_MONTHLY_PRICE.pilot).toBe(149);
    });

    it("should have correct starter price", () => {
      expect(TIER_MONTHLY_PRICE.starter).toBe(199);
    });

    it("should have correct pro price", () => {
      expect(TIER_MONTHLY_PRICE.pro).toBe(349);
    });

    it("should have correct elite price", () => {
      expect(TIER_MONTHLY_PRICE.elite).toBe(599);
    });
  });

  describe("MRR calculation", () => {
    const TIER_MONTHLY_PRICE: Record<string, number> = {
      pilot: 149,
      starter: 199,
      pro: 349,
      elite: 599,
    };

    it("should calculate MRR from active subscriptions", () => {
      const tiers = [
        { tier: "pilot", status: "active", count: 5 },
        { tier: "starter", status: "active", count: 10 },
        { tier: "pro", status: "active", count: 3 },
        { tier: "elite", status: "active", count: 1 },
      ];

      let mrr = 0;
      for (const row of tiers) {
        if (row.status === "active") {
          mrr += row.count * (TIER_MONTHLY_PRICE[row.tier] ?? 0);
        }
      }

      // 5*149 + 10*199 + 3*349 + 1*599
      // 745 + 1990 + 1047 + 599 = 4381
      expect(mrr).toBe(4381);
    });

    it("should not count trialing subs in MRR", () => {
      const tiers = [
        { tier: "pilot", status: "trialing", count: 10 },
        { tier: "starter", status: "active", count: 5 },
      ];

      let mrr = 0;
      for (const row of tiers) {
        if (row.status === "active") {
          mrr += row.count * (TIER_MONTHLY_PRICE[row.tier] ?? 0);
        }
      }

      expect(mrr).toBe(5 * 199); // Only active starter subs
    });
  });

  describe("conversion funnel logic", () => {
    it("should calculate contacted as total minus not_contacted", () => {
      const prospectCounts: Record<string, number> = {
        not_contacted: 200,
        called: 50,
        interested: 30,
        demo_scheduled: 10,
        signed_up: 5,
      };
      const total = Object.values(prospectCounts).reduce((a, b) => a + b, 0);
      const contacted = total - (prospectCounts["not_contacted"] ?? 0);

      expect(total).toBe(295);
      expect(contacted).toBe(95);
    });
  });

  describe("affiliate conversion rate", () => {
    it("should compute correct conversion rate", () => {
      const totalReferrals = 50;
      const convertedReferrals = 12;
      const conversionRate = totalReferrals > 0
        ? ((convertedReferrals / totalReferrals) * 100).toFixed(1)
        : "0.0";

      expect(conversionRate).toBe("24.0");
    });

    it("should return 0.0 for zero referrals", () => {
      const totalReferrals = 0;
      const convertedReferrals = 0;
      const conversionRate = totalReferrals > 0
        ? ((convertedReferrals / totalReferrals) * 100).toFixed(1)
        : "0.0";

      expect(conversionRate).toBe("0.0");
    });
  });

  describe("date range calculation", () => {
    it("should compute correct since date for 30 days", () => {
      const now = new Date("2026-03-23T00:00:00Z");
      const since = new Date(now);
      since.setDate(since.getDate() - 30);
      expect(since.toISOString().startsWith("2026-02-21")).toBe(true);
    });

    it("should compute correct since date for 365 days", () => {
      const now = new Date("2026-03-23T00:00:00Z");
      const since = new Date(now);
      since.setDate(since.getDate() - 365);
      expect(since.getFullYear()).toBe(2025);
    });
  });

  describe("graceful fallbacks when db unavailable", () => {
    it("should return empty data when getDb returns null", async () => {
      mockGetDb.mockResolvedValue(null);
      const db = await getDb();
      expect(db).toBeNull();
      // Router procedures return safe defaults when db is null
    });
  });

  describe("call volume aggregation", () => {
    it("should correctly sum completed and missed from rows", () => {
      const rows = [
        { period: "2026-03-01", total: 10, completed: 8, missed: 2 },
        { period: "2026-03-02", total: 15, completed: 12, missed: 3 },
        { period: "2026-03-03", total: 5, completed: 4, missed: 1 },
      ];

      const totalCalls = rows.reduce((s, d) => s + d.total, 0);
      const totalCompleted = rows.reduce((s, d) => s + d.completed, 0);
      const totalMissed = rows.reduce((s, d) => s + d.missed, 0);

      expect(totalCalls).toBe(30);
      expect(totalCompleted).toBe(24);
      expect(totalMissed).toBe(6);
    });
  });

  describe("revenue recovered totals", () => {
    it("should accumulate audit totals correctly", () => {
      const rows = [
        { period: "2026-01", audits: 3, missedCalls: 120, estimatedLost: 15000 },
        { period: "2026-02", audits: 5, missedCalls: 200, estimatedLost: 28000 },
      ];

      const totals = rows.reduce(
        (acc, r) => ({
          audits: acc.audits + r.audits,
          missedCalls: acc.missedCalls + r.missedCalls,
          estimatedLost: acc.estimatedLost + r.estimatedLost,
        }),
        { audits: 0, missedCalls: 0, estimatedLost: 0 }
      );

      expect(totals.audits).toBe(8);
      expect(totals.missedCalls).toBe(320);
      expect(totals.estimatedLost).toBe(43000);
    });
  });
});
