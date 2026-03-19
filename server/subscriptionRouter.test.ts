import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Subscription Router Tests
 *
 * Tests all tRPC procedures on the subscriptionRouter in isolation.
 * Database calls are mocked via vi.mock.
 *
 * Coverage:
 * - subscription.getByShop (overage calc, ownership check)
 * - subscription.create (happy path, conflict)
 * - subscription.changeTier (upgrade, no-sub error)
 * - subscription.getTierConfig
 * - subscription.listAll
 * - subscription.getUsage
 */

// ─── Mock Data Factories ────────────────────────────────────────────────

const { mockShop, mockSubscription, mockUsageRecord } = vi.hoisted(() => {
  const now = new Date();
  return {
    mockShop: {
      id: 1,
      ownerId: 1,
      organizationId: null,
      name: "Test Auto Shop",
      phone: "(555) 123-4567",
      address: "123 Main St",
      city: "Austin",
      state: "TX",
      zip: "78701",
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
      tier: "pro" as const,
      status: "active" as const,
      includedMinutes: 750,
      usedMinutes: 200,
      overageRate: "0.1500",
      billingCycle: "monthly" as const,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      setupFeeAmount: "1000.00",
      setupFeePaid: false,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      createdAt: now,
      updatedAt: now,
    },
    mockUsageRecord: {
      id: 1,
      subscriptionId: 1,
      periodStart: now,
      periodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      minutesUsed: 200,
      overageMinutes: 0,
      overageCharge: "0.00",
      createdAt: now,
    },
  };
});

// ─── Mock Modules ───────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getShopsByOwner: vi.fn().mockResolvedValue([mockShop]),
  getShopById: vi.fn().mockResolvedValue(mockShop),
  createShop: vi.fn().mockResolvedValue(1),
  updateShop: vi.fn().mockResolvedValue(undefined),
  deleteShop: vi.fn().mockResolvedValue(undefined),
  getAgentConfigByShop: vi.fn().mockResolvedValue(null),
  upsertAgentConfig: vi.fn().mockResolvedValue(1),
  getSubscriptionByShop: vi.fn().mockResolvedValue(mockSubscription),
  createSubscription: vi.fn().mockResolvedValue(1),
  updateSubscription: vi.fn().mockResolvedValue(undefined),
  getUsageBySubscription: vi.fn().mockResolvedValue([mockUsageRecord]),
  getCallLogsByShop: vi.fn().mockResolvedValue([]),
  getCallLogCountByShop: vi.fn().mockResolvedValue(0),
  getShopAnalytics: vi.fn().mockResolvedValue({}),
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
  createContactSubmission: vi.fn().mockResolvedValue(1),
}));

vi.mock("./services/twilioProvisioning", () => ({
  twilioProvisioning: {
    provisionPhoneNumber: vi.fn().mockResolvedValue({ phoneNumber: "+15550001111", sid: "PN_test" }),
    releasePhoneNumber: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("./services/auditService", () => ({
  auditService: {
    runAudit: vi.fn().mockResolvedValue({ missedCalls: 0 }),
  },
}));

// ─── Test Helpers ───────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const testUser: AuthenticatedUser = {
  id: 1,
  openId: "test-user-openid",
  email: "test@baylio.io",
  name: "Test User",
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

describe("subscription", () => {
  // 1. getByShop returns subscription with correct overage calculation (0 overage when under limit)
  it("getByShop returns subscription with correct overage calculation (0 overage when under limit)", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.getByShop({ shopId: 1 });
    expect(result).toBeDefined();
    expect(result?.tier).toBe("pro");
    expect(result?.usagePercent).toBe(27); // 200/750 = 26.67 -> 27
    expect(result?.overageMinutes).toBe(0);
    expect(result?.overageCharge).toBe("0.00");
  });

  // 2. getByShop calculates overage correctly when over limit
  it("getByShop calculates overage correctly when over limit", async () => {
    const { getSubscriptionByShop } = await import("./db");
    (getSubscriptionByShop as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockSubscription,
      usedMinutes: 900, // 150 over the 750 included
    });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.getByShop({ shopId: 1 });
    expect(result?.overageMinutes).toBe(150);
    expect(result?.overageCharge).toBe("22.50"); // 150 * 0.15
    expect(result?.usagePercent).toBe(100); // capped at 100
  });

  // 3. getByShop returns null when shop not owned by user
  it("getByShop returns null when shop not owned by user", async () => {
    const { getShopById } = await import("./db");
    (getShopById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockShop,
      ownerId: 999, // different owner
    });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.getByShop({ shopId: 1 });
    expect(result).toBeNull();
  });

  // 4. create succeeds with valid input and no existing subscription
  it("create succeeds with valid input and no existing subscription", async () => {
    const { getSubscriptionByShop } = await import("./db");
    (getSubscriptionByShop as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.create({
      shopId: 1,
      tier: "pro",
      billingCycle: "monthly",
    });
    expect(result.id).toBe(1);
    expect(result.tierConfig.monthlyPrice).toBe(349);
    expect(result.tierConfig.includedMinutes).toBe(750);
  });

  // 5. create fails when subscription already exists (CONFLICT error)
  it("create fails when subscription already exists (CONFLICT error)", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.subscription.create({ shopId: 1, tier: "starter" })
    ).rejects.toThrow("Subscription already exists for this shop");
  });

  // 6. changeTier upgrades tier and updates includedMinutes
  it("changeTier upgrades tier and updates includedMinutes", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.changeTier({
      shopId: 1,
      newTier: "elite",
    });
    expect(result.success).toBe(true);
    expect(result.newTier).toBe("elite");
    expect(result.tierConfig.monthlyPrice).toBe(599);
    expect(result.tierConfig.includedMinutes).toBe(1500);
  });

  // 7. changeTier fails when no subscription exists
  it("changeTier fails when no subscription exists", async () => {
    const { getSubscriptionByShop } = await import("./db");
    (getSubscriptionByShop as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.subscription.changeTier({ shopId: 1, newTier: "elite" })
    ).rejects.toThrow("No active subscription found");
  });

  // 8. getTierConfig returns all 3 tiers
  it("getTierConfig returns all 3 tiers", async () => {
    const caller = appRouter.createCaller(createContext());
    const config = await caller.subscription.getTierConfig();
    expect(config.starter).toBeDefined();
    expect(config.pro).toBeDefined();
    expect(config.elite).toBeDefined();
    expect(config.starter.monthlyPrice).toBe(199);
    expect(config.starter.includedMinutes).toBe(300);
    expect(config.pro.monthlyPrice).toBe(349);
    expect(config.pro.includedMinutes).toBe(750);
    expect(config.elite.monthlyPrice).toBe(599);
    expect(config.elite.includedMinutes).toBe(1500);
  });

  // 9. listAll returns shops with their subscriptions
  it("listAll returns shops with their subscriptions", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.listAll();
    expect(result).toHaveLength(1);
    expect(result[0].shop.name).toBe("Test Auto Shop");
    expect(result[0].subscription).toBeDefined();
    expect(result[0].subscription?.tier).toBe("pro");
  });

  // 10. getUsage returns usage records
  it("getUsage returns usage records", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.getUsage({ shopId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].minutesUsed).toBe(200);
  });
});
