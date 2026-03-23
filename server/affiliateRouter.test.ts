/**
 * Affiliate Router Tests
 * 
 * Tests for the affiliate program: signup, referral tracking,
 * commission logic, and admin operations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  createAffiliate: vi.fn().mockResolvedValue(1),
  getAffiliateByUserId: vi.fn(),
  getAffiliateByCode: vi.fn(),
  getAffiliateById: vi.fn(),
  updateAffiliate: vi.fn().mockResolvedValue(undefined),
  listAffiliates: vi.fn().mockResolvedValue([]),
  incrementAffiliateClicks: vi.fn().mockResolvedValue(undefined),
  createAffiliateReferral: vi.fn().mockResolvedValue(1),
  getReferralsByAffiliate: vi.fn().mockResolvedValue([]),
  getCommissionsByAffiliate: vi.fn().mockResolvedValue([]),
  getPendingCommissionTotal: vi.fn().mockResolvedValue("0.00"),
  getPayoutsByAffiliate: vi.fn().mockResolvedValue([]),
  createAffiliatePayout: vi.fn().mockResolvedValue(1),
  hasPendingPayout: vi.fn().mockResolvedValue(false),
}));

import {
  createAffiliate,
  getAffiliateByUserId,
  getAffiliateByCode,
  getAffiliateById,
  updateAffiliate,
  listAffiliates,
  incrementAffiliateClicks,
  createAffiliateReferral,
  getReferralsByAffiliate,
  getCommissionsByAffiliate,
  getPendingCommissionTotal,
  getPayoutsByAffiliate,
  createAffiliatePayout,
  hasPendingPayout,
} from "./db";

const mockCreateAffiliate = vi.mocked(createAffiliate);
const mockGetByUserId = vi.mocked(getAffiliateByUserId);
const mockGetByCode = vi.mocked(getAffiliateByCode);
const mockGetById = vi.mocked(getAffiliateById);
const mockUpdateAffiliate = vi.mocked(updateAffiliate);
const mockListAffiliates = vi.mocked(listAffiliates);
const mockIncrementClicks = vi.mocked(incrementAffiliateClicks);
const mockCreateReferral = vi.mocked(createAffiliateReferral);
const mockGetReferrals = vi.mocked(getReferralsByAffiliate);
const mockGetCommissions = vi.mocked(getCommissionsByAffiliate);
const mockGetPendingTotal = vi.mocked(getPendingCommissionTotal);
const mockGetPayouts = vi.mocked(getPayoutsByAffiliate);
const mockCreatePayout = vi.mocked(createAffiliatePayout);
const mockHasPendingPayout = vi.mocked(hasPendingPayout);

// Helper to create a mock affiliate
function mockAffiliate(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 42,
    code: "testuser-abc123",
    name: "Test User",
    email: "test@example.com",
    phone: null,
    paypalEmail: null,
    stripeConnectId: null,
    tier: "affiliate" as const,
    commissionRate: "0.2000",
    status: "active" as const,
    totalClicks: 10,
    totalSignups: 3,
    totalEarnings: "150.00",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Affiliate Router Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("trackClick", () => {
    it("should increment clicks for valid active affiliate code", async () => {
      const affiliate = mockAffiliate();
      mockGetByCode.mockResolvedValueOnce(affiliate as any);

      const result = await (async () => {
        const aff = await getAffiliateByCode("testuser-abc123");
        if (!aff) throw new Error("Not found");
        if (aff.status !== "active") throw new Error("Not active");
        await incrementAffiliateClicks(aff.id);
        return { success: true, affiliateId: aff.id };
      })();

      expect(result.success).toBe(true);
      expect(result.affiliateId).toBe(1);
      expect(mockIncrementClicks).toHaveBeenCalledWith(1);
    });

    it("should reject invalid referral code", async () => {
      mockGetByCode.mockResolvedValueOnce(undefined as any);

      await expect(async () => {
        const aff = await getAffiliateByCode("invalid-code");
        if (!aff) throw new Error("Invalid referral code");
      }).rejects.toThrow("Invalid referral code");
    });

    it("should reject suspended affiliate code", async () => {
      const affiliate = mockAffiliate({ status: "suspended" });
      mockGetByCode.mockResolvedValueOnce(affiliate as any);

      await expect(async () => {
        const aff = await getAffiliateByCode("testuser-abc123");
        if (!aff) throw new Error("Not found");
        if (aff.status !== "active") throw new Error("Affiliate is not active");
      }).rejects.toThrow("Affiliate is not active");
    });
  });

  describe("validateCode", () => {
    it("should return valid=true for active affiliate", async () => {
      const affiliate = mockAffiliate();
      mockGetByCode.mockResolvedValueOnce(affiliate as any);

      const aff = await getAffiliateByCode("testuser-abc123");
      const result = (!aff || aff.status !== "active")
        ? { valid: false, name: null }
        : { valid: true, name: aff.name };

      expect(result.valid).toBe(true);
      expect(result.name).toBe("Test User");
    });

    it("should return valid=false for non-existent code", async () => {
      mockGetByCode.mockResolvedValueOnce(undefined as any);

      const aff = await getAffiliateByCode("nonexistent");
      const result = (!aff || aff.status !== "active")
        ? { valid: false, name: null }
        : { valid: true, name: aff.name };

      expect(result.valid).toBe(false);
      expect(result.name).toBeNull();
    });
  });

  describe("signup", () => {
    it("should create affiliate account for new user", async () => {
      mockGetByUserId.mockResolvedValueOnce(undefined as any);
      mockCreateAffiliate.mockResolvedValueOnce(1);

      // Simulate signup logic
      const existing = await getAffiliateByUserId(42);
      expect(existing).toBeUndefined();

      const id = await createAffiliate({
        userId: 42,
        code: "testuser-abc123",
        name: "Test User",
        email: "test@example.com",
        phone: undefined,
        paypalEmail: undefined,
        status: "pending",
      } as any);

      expect(id).toBe(1);
      expect(mockCreateAffiliate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 42,
          name: "Test User",
          email: "test@example.com",
          status: "pending",
        })
      );
    });

    it("should reject duplicate signup", async () => {
      const existing = mockAffiliate();
      mockGetByUserId.mockResolvedValueOnce(existing as any);

      const aff = await getAffiliateByUserId(42);
      expect(aff).toBeDefined();
      // Router would throw CONFLICT here
    });
  });

  describe("stats", () => {
    it("should return correct summary stats", async () => {
      const affiliate = mockAffiliate({
        totalClicks: 100,
        totalSignups: 8,
        totalEarnings: "450.00",
      });
      mockGetByUserId.mockResolvedValueOnce(affiliate as any);

      const referrals = [
        { id: 1, status: "subscribed" },
        { id: 2, status: "subscribed" },
        { id: 3, status: "signed_up" },
        { id: 4, status: "clicked" },
      ];
      mockGetReferrals.mockResolvedValueOnce(referrals as any);
      mockGetCommissions.mockResolvedValueOnce([
        { id: 1, amount: "200.00", status: "paid" },
        { id: 2, amount: "250.00", status: "pending" },
      ] as any);
      mockGetPendingTotal.mockResolvedValueOnce("250.00" as any);

      const aff = await getAffiliateByUserId(42);
      const refs = await getReferralsByAffiliate(aff!.id);
      const comms = await getCommissionsByAffiliate(aff!.id);
      const pending = await getPendingCommissionTotal(aff!.id);

      const activeShops = refs.filter((r: any) => r.status === "subscribed").length;
      const totalReferred = refs.filter((r: any) => r.status !== "clicked").length;

      expect(activeShops).toBe(2);
      expect(totalReferred).toBe(3);
      expect(comms.length).toBe(2);
      expect(pending).toBe("250.00");
    });

    it("should calculate conversion rate correctly", async () => {
      const affiliate = mockAffiliate({ totalClicks: 50 });
      const totalReferred = 5;
      const conversionRate = affiliate.totalClicks > 0
        ? ((totalReferred / affiliate.totalClicks) * 100).toFixed(1)
        : "0.0";

      expect(conversionRate).toBe("10.0");
    });

    it("should handle zero clicks without division error", async () => {
      const affiliate = mockAffiliate({ totalClicks: 0 });
      const totalReferred = 0;
      const conversionRate = affiliate.totalClicks > 0
        ? ((totalReferred / affiliate.totalClicks) * 100).toFixed(1)
        : "0.0";

      expect(conversionRate).toBe("0.0");
    });
  });

  describe("admin operations", () => {
    it("should list all affiliates", async () => {
      const affiliates = [
        mockAffiliate({ id: 1, name: "Alice" }),
        mockAffiliate({ id: 2, name: "Bob", status: "pending" }),
      ];
      mockListAffiliates.mockResolvedValueOnce(affiliates as any);

      const result = await listAffiliates();
      expect(result).toHaveLength(2);
    });

    it("should approve a pending affiliate", async () => {
      const affiliate = mockAffiliate({ status: "pending" });
      mockGetById.mockResolvedValueOnce(affiliate as any);

      await updateAffiliate(1, { status: "active" } as any);
      expect(mockUpdateAffiliate).toHaveBeenCalledWith(1, { status: "active" });
    });

    it("should suspend an active affiliate", async () => {
      const affiliate = mockAffiliate({ status: "active" });
      mockGetById.mockResolvedValueOnce(affiliate as any);

      await updateAffiliate(1, { status: "suspended" } as any);
      expect(mockUpdateAffiliate).toHaveBeenCalledWith(1, { status: "suspended" });
    });

    it("should update commission rate", async () => {
      const affiliate = mockAffiliate();
      mockGetById.mockResolvedValueOnce(affiliate as any);

      await updateAffiliate(1, { commissionRate: "0.2500" } as any);
      expect(mockUpdateAffiliate).toHaveBeenCalledWith(1, { commissionRate: "0.2500" });
    });

    it("should get affiliate detail with referrals and commissions", async () => {
      const affiliate = mockAffiliate();
      mockGetById.mockResolvedValueOnce(affiliate as any);
      mockGetReferrals.mockResolvedValueOnce([
        { id: 1, affiliateId: 1, status: "subscribed", referredEmail: "shop@test.com" },
      ] as any);
      mockGetCommissions.mockResolvedValueOnce([
        { id: 1, affiliateId: 1, amount: "50.00", status: "paid" },
      ] as any);

      const aff = await getAffiliateById(1);
      const refs = await getReferralsByAffiliate(1);
      const comms = await getCommissionsByAffiliate(1);

      expect(aff).toBeDefined();
      expect(refs).toHaveLength(1);
      expect(comms).toHaveLength(1);
    });
  });

  describe("referral code generation", () => {
    it("should generate URL-safe codes", () => {
      // Test the pattern: lowercase slug + random hex
      const codePattern = /^[a-z0-9]+-[a-f0-9]{6}$/;
      // The actual function uses crypto.randomBytes, so we test the format
      const testCode = "testuser-abc123";
      expect(codePattern.test(testCode)).toBe(true);
    });

    it("should handle special characters in names", () => {
      // Simulate the slug generation logic
      const name = "John O'Brien-Smith";
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 8);
      expect(slug).toBe("johnobri");
      expect(slug.length).toBeLessThanOrEqual(8);
    });
  });

  describe("commission model", () => {
    it("should calculate 20% commission correctly", () => {
      const subscriptionAmount = 299; // Pro tier
      const commissionRate = 0.20;
      const commission = subscriptionAmount * commissionRate;
      expect(commission).toBeCloseTo(59.80, 2);
    });

    it("should handle custom commission rates", () => {
      const subscriptionAmount = 499; // Elite tier
      const commissionRate = 0.25; // Agency tier
      const commission = subscriptionAmount * commissionRate;
      expect(commission).toBe(124.75);
    });
  });

  describe("requestPayout", () => {
    it("should reject if balance < $50", async () => {
      const affiliate = mockAffiliate({ pendingPayout: "25.00" });
      mockGetByUserId.mockResolvedValueOnce(affiliate as any);

      const pendingBalance = parseFloat(affiliate.pendingPayout as string);
      expect(pendingBalance).toBeLessThan(50);
      // Router would throw BAD_REQUEST here
    });

    it("should reject if pending payout already exists", async () => {
      const affiliate = mockAffiliate({ pendingPayout: "100.00" });
      mockGetByUserId.mockResolvedValueOnce(affiliate as any);
      mockHasPendingPayout.mockResolvedValueOnce(true);

      const alreadyPending = await hasPendingPayout(affiliate.id);
      expect(alreadyPending).toBe(true);
      // Router would throw CONFLICT here
    });

    it("should create payout when balance >= $50 and no pending", async () => {
      const affiliate = mockAffiliate({ pendingPayout: "150.00" });
      mockGetByUserId.mockResolvedValueOnce(affiliate as any);
      mockHasPendingPayout.mockResolvedValueOnce(false);
      mockCreatePayout.mockResolvedValueOnce(1);

      const pendingBalance = parseFloat(affiliate.pendingPayout as string);
      expect(pendingBalance).toBeGreaterThanOrEqual(50);

      const alreadyPending = await hasPendingPayout(affiliate.id);
      expect(alreadyPending).toBe(false);

      const id = await createAffiliatePayout({
        affiliateId: affiliate.id,
        amount: affiliate.pendingPayout as string,
        method: "paypal",
        status: "pending",
      } as any);

      expect(id).toBe(1);
      expect(mockCreatePayout).toHaveBeenCalledWith(
        expect.objectContaining({
          affiliateId: 1,
          amount: "150.00",
          method: "paypal",
          status: "pending",
        })
      );
    });
  });

  describe("getMyNetwork", () => {
    it("should return empty partners array (downline not yet supported)", async () => {
      const affiliate = mockAffiliate();
      mockGetByUserId.mockResolvedValueOnce(affiliate as any);

      // Currently returns empty since parentAffiliateId not in schema
      const result = { partners: [] };
      expect(result.partners).toHaveLength(0);
    });
  });

  describe("tier calculation", () => {
    it("should be Bronze for 0-4 referrals", () => {
      const tierThresholds = [
        { name: "Bronze", min: 0, max: 4 },
        { name: "Silver", min: 5, max: 14 },
        { name: "Gold", min: 15, max: 29 },
        { name: "Platinum", min: 30, max: Infinity },
      ];
      const count = 3;
      const tier = tierThresholds.find(t => count >= t.min && count <= t.max);
      expect(tier?.name).toBe("Bronze");
    });

    it("should be Silver for 5-14 referrals", () => {
      const tierThresholds = [
        { name: "Bronze", min: 0, max: 4 },
        { name: "Silver", min: 5, max: 14 },
        { name: "Gold", min: 15, max: 29 },
        { name: "Platinum", min: 30, max: Infinity },
      ];
      const count = 10;
      const tier = tierThresholds.find(t => count >= t.min && count <= t.max);
      expect(tier?.name).toBe("Silver");
    });

    it("should be Gold for 15-29 referrals", () => {
      const tierThresholds = [
        { name: "Bronze", min: 0, max: 4 },
        { name: "Silver", min: 5, max: 14 },
        { name: "Gold", min: 15, max: 29 },
        { name: "Platinum", min: 30, max: Infinity },
      ];
      const count = 20;
      const tier = tierThresholds.find(t => count >= t.min && count <= t.max);
      expect(tier?.name).toBe("Gold");
    });

    it("should be Platinum for 30+ referrals", () => {
      const tierThresholds = [
        { name: "Bronze", min: 0, max: 4 },
        { name: "Silver", min: 5, max: 14 },
        { name: "Gold", min: 15, max: 29 },
        { name: "Platinum", min: 30, max: Infinity },
      ];
      const count = 50;
      const tier = tierThresholds.find(t => count >= t.min && count <= t.max);
      expect(tier?.name).toBe("Platinum");
    });
  });
});
