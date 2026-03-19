import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

/**
 * Integration Tests — Onboard Flow
 *
 * Tests the interaction between multiple modules during the onboarding
 * lifecycle:
 *
 * 1. Contact form submission → DB record creation
 * 2. Subscription creation → tier config validation
 * 3. Tier change → subscription update with correct included minutes
 */

// ─── Mock Data ──────────────────────────────────────────────────────────

const { mockShop, mockSubscription } = vi.hoisted(() => {
  const now = new Date();
  return {
    mockShop: {
      id: 1,
      ownerId: 1,
      organizationId: null,
      name: "Onboard Test Shop",
      phone: "(555) 100-2000",
      address: "456 Elm St",
      city: "Houston",
      state: "TX",
      zip: "77001",
      timezone: "America/Chicago",
      businessHours: null,
      serviceCatalog: null,
      isActive: true,
      twilioPhoneNumber: null,
      twilioPhoneSid: null,
      createdAt: now,
      updatedAt: now,
    },
    mockSubscription: {
      id: 1,
      shopId: 1,
      tier: "starter" as const,
      status: "active" as const,
      includedMinutes: 300,
      usedMinutes: 0,
      overageRate: "0.1500",
      billingCycle: "monthly" as const,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      setupFeeAmount: "500.00",
      setupFeePaid: false,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    },
  };
});

// ─── Mock ALL modules that appRouter imports ────────────────────────────

vi.mock("../db", () => ({
  getShopsByOwner: vi.fn().mockResolvedValue([mockShop]),
  getShopById: vi.fn().mockResolvedValue(mockShop),
  createShop: vi.fn().mockResolvedValue(1),
  updateShop: vi.fn().mockResolvedValue(undefined),
  deleteShop: vi.fn().mockResolvedValue(undefined),
  getAgentConfigByShop: vi.fn().mockResolvedValue(null),
  upsertAgentConfig: vi.fn().mockResolvedValue(1),
  getSubscriptionByShop: vi.fn().mockResolvedValue(null),
  createSubscription: vi.fn().mockResolvedValue(1),
  updateSubscription: vi.fn().mockResolvedValue(undefined),
  getUsageBySubscription: vi.fn().mockResolvedValue([]),
  getCallLogsByShop: vi.fn().mockResolvedValue([]),
  getCallLogCountByShop: vi.fn().mockResolvedValue(0),
  getShopAnalytics: vi.fn().mockResolvedValue(null),
  getMissedCallAudits: vi.fn().mockResolvedValue([]),
  createMissedCallAudit: vi.fn().mockResolvedValue(1),
  updateMissedCallAudit: vi.fn().mockResolvedValue(undefined),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  getOrganizationsByOwner: vi.fn().mockResolvedValue([]),
  createOrganization: vi.fn().mockResolvedValue(1),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  createContactSubmission: vi.fn().mockResolvedValue(42),
}));

vi.mock("../services/twilioProvisioning", () => ({
  validateTwilioCredentials: vi.fn().mockResolvedValue({
    accountSid: "AC_test",
    friendlyName: "Test",
    status: "active",
  }),
  searchAvailableNumbers: vi.fn().mockResolvedValue([]),
  purchasePhoneNumber: vi.fn().mockResolvedValue({
    sid: "PN_test",
    phoneNumber: "+15550001111",
    friendlyName: "Test",
    voiceUrl: "",
    statusCallbackUrl: "",
  }),
  releasePhoneNumber: vi.fn().mockResolvedValue(undefined),
  getAccountBalance: vi.fn().mockResolvedValue({ balance: "100.00", currency: "USD" }),
}));

vi.mock("../services/auditService", () => ({
  generateScorecard: vi.fn().mockResolvedValue(null),
  completeAudit: vi.fn().mockResolvedValue(null),
}));

// ─── Test Helpers ───────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const testUser: AuthenticatedUser = {
  id: 1,
  openId: "onboard-test-openid",
  email: "onboard@baylio.io",
  name: "Onboard Tester",
  loginMethod: "manus",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(user: AuthenticatedUser | null = testUser): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe("Onboard flow integration", () => {
  describe("1. Contact form → DB submission", () => {
    it("contact.submit creates a record and returns success with an id", async () => {
      const caller = appRouter.createCaller(createContext(null));
      const result = await caller.contact.submit({
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "(555) 222-3333",
        message: "I want to learn more about Baylio for my auto shop.",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe(42);

      // Verify the db function was called with the correct shape
      const { createContactSubmission } = await import("../db");
      expect(createContactSubmission).toHaveBeenCalledWith({
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "(555) 222-3333",
        message: "I want to learn more about Baylio for my auto shop.",
      });
    });
  });

  describe("2. Subscription creation → tier config validation", () => {
    it("creating a starter subscription sets includedMinutes to 300", async () => {
      const caller = appRouter.createCaller(createContext());
      const result = await caller.subscription.create({
        shopId: 1,
        tier: "starter",
        billingCycle: "monthly",
      });

      expect(result.id).toBe(1);
      expect(result.tierConfig.includedMinutes).toBe(300);
      expect(result.tierConfig.monthlyPrice).toBe(199);

      const { createSubscription } = await import("../db");
      expect(createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          shopId: 1,
          tier: "starter",
          includedMinutes: 300,
          usedMinutes: 0,
          status: "active",
        })
      );
    });

    it("creating a pro subscription sets includedMinutes to 750", async () => {
      const caller = appRouter.createCaller(createContext());
      const result = await caller.subscription.create({
        shopId: 1,
        tier: "pro",
        billingCycle: "monthly",
      });

      expect(result.id).toBe(1);
      expect(result.tierConfig.includedMinutes).toBe(750);
      expect(result.tierConfig.monthlyPrice).toBe(349);
    });

    it("creating an elite subscription sets includedMinutes to 1500", async () => {
      const caller = appRouter.createCaller(createContext());
      const result = await caller.subscription.create({
        shopId: 1,
        tier: "elite",
        billingCycle: "monthly",
      });

      expect(result.id).toBe(1);
      expect(result.tierConfig.includedMinutes).toBe(1500);
      expect(result.tierConfig.monthlyPrice).toBe(599);
    });
  });

  describe("3. Tier change → subscription update", () => {
    it("upgrade from starter to pro changes included minutes from 300 to 750", async () => {
      // Return an existing starter subscription for changeTier to find
      const { getSubscriptionByShop, updateSubscription } = await import("../db");
      (getSubscriptionByShop as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSubscription);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.subscription.changeTier({
        shopId: 1,
        newTier: "pro",
      });

      expect(result.success).toBe(true);
      expect(result.newTier).toBe("pro");
      expect(result.tierConfig.includedMinutes).toBe(750);
      expect(result.tierConfig.monthlyPrice).toBe(349);

      // Verify the DB was updated with the new tier and minutes
      expect(updateSubscription).toHaveBeenCalledWith(mockSubscription.id, {
        tier: "pro",
        includedMinutes: 750,
      });
    });

    it("upgrade from starter to elite changes included minutes from 300 to 1500", async () => {
      const { getSubscriptionByShop, updateSubscription } = await import("../db");
      (getSubscriptionByShop as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSubscription);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.subscription.changeTier({
        shopId: 1,
        newTier: "elite",
      });

      expect(result.success).toBe(true);
      expect(result.newTier).toBe("elite");
      expect(result.tierConfig.includedMinutes).toBe(1500);
      expect(result.tierConfig.monthlyPrice).toBe(599);

      expect(updateSubscription).toHaveBeenCalledWith(mockSubscription.id, {
        tier: "elite",
        includedMinutes: 1500,
      });
    });

    it("changeTier throws when no subscription exists", async () => {
      const { getSubscriptionByShop } = await import("../db");
      (getSubscriptionByShop as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const caller = appRouter.createCaller(createContext());
      await expect(
        caller.subscription.changeTier({ shopId: 1, newTier: "pro" })
      ).rejects.toThrow("No active subscription found");
    });
  });
});
