import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock Data Factories (must use vi.hoisted) ─────────────────────────

const { mockShop, mockAgentConfig, mockSubscription } = vi.hoisted(() => {
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
    mockAgentConfig: {
      id: 1,
      shopId: 1,
      voiceId: "voice_123",
      voiceName: "Rachel",
      agentName: "Baylio",
      systemPrompt: "You are a helpful auto shop receptionist.",
      greeting: "Thanks for calling Test Auto Shop!",
      upsellEnabled: true,
      upsellRules: null,
      confidenceThreshold: "0.80",
      maxUpsellsPerCall: 1,
      language: "en",
      elevenLabsAgentId: null,
      isActive: true,
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
  };
});

// Mock the db module
vi.mock("./db", () => ({
  getShopsByOwner: vi.fn().mockResolvedValue([mockShop]),
  getShopById: vi.fn().mockResolvedValue(mockShop),
  createShop: vi.fn().mockResolvedValue(1),
  updateShop: vi.fn().mockResolvedValue(undefined),
  deleteShop: vi.fn().mockResolvedValue(undefined),
  getAgentConfigByShop: vi.fn().mockResolvedValue(mockAgentConfig),
  upsertAgentConfig: vi.fn().mockResolvedValue(1),
  getSubscriptionByShop: vi.fn().mockResolvedValue(mockSubscription),
  createSubscription: vi.fn().mockResolvedValue(1),
  updateSubscription: vi.fn().mockResolvedValue(undefined),
  getUsageBySubscription: vi.fn().mockResolvedValue([]),
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

// Mock Twilio provisioning service
vi.mock("./services/twilioProvisioning", () => ({
  validateTwilioCredentials: vi.fn().mockResolvedValue({ accountSid: "AC_TEST", friendlyName: "Test" }),
  searchAvailableNumbers: vi.fn().mockResolvedValue([]),
  purchasePhoneNumber: vi.fn().mockResolvedValue({ phoneNumber: "+15551234567", sid: "PN_TEST" }),
  releasePhoneNumber: vi.fn().mockResolvedValue(undefined),
  getAccountBalance: vi.fn().mockResolvedValue({ currency: "USD", balance: "100.00" }),
}));

// Mock auditService (imported by callRouter)
vi.mock("./services/auditService", () => ({
  generateScorecard: vi.fn().mockResolvedValue(undefined),
  completeAudit: vi.fn().mockResolvedValue(undefined),
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

// ─── Shop Router Tests ──────────────────────────────────────────────────

describe("shopRouter", () => {
  it("list returns shops for the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext());
    const shops = await caller.shop.list();
    expect(shops).toHaveLength(1);
    expect(shops[0].name).toBe("Test Auto Shop");
    expect(shops[0].ownerId).toBe(testUser.id);
  });

  it("getById returns shop owned by user", async () => {
    const caller = appRouter.createCaller(createContext());
    const shop = await caller.shop.getById({ id: 1 });
    expect(shop).toBeDefined();
    expect(shop?.id).toBe(1);
    expect(shop?.name).toBe("Test Auto Shop");
    expect(shop?.city).toBe("Austin");
  });

  it("getById returns null for non-owner", async () => {
    const { getShopById } = await import("./db");
    (getShopById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockShop,
      ownerId: 999,
    });

    const caller = appRouter.createCaller(createContext());
    const shop = await caller.shop.getById({ id: 1 });
    expect(shop).toBeNull();
  });

  it("create creates a shop with valid input", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.shop.create({
      name: "New Auto Shop",
      phone: "(555) 999-0000",
      city: "Dallas",
      state: "TX",
    });
    expect(result.id).toBe(1);

    // Verify createShop was called with ownerId from context
    const { createShop } = await import("./db");
    expect(createShop).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Auto Shop",
        ownerId: testUser.id,
      })
    );
  });

  it("update updates shop for owner", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.shop.update({
      id: 1,
      data: { name: "Updated Auto Shop" },
    });
    expect(result).toEqual({ success: true });

    const { updateShop } = await import("./db");
    expect(updateShop).toHaveBeenCalledWith(1, expect.objectContaining({ name: "Updated Auto Shop" }));
  });

  it("update throws FORBIDDEN for non-owner", async () => {
    const { getShopById } = await import("./db");
    (getShopById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockShop,
      ownerId: 999,
    });

    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.shop.update({ id: 1, data: { name: "Hacked Shop" } })
    ).rejects.toThrow("Shop not found or access denied");
  });

  it("delete deletes shop for owner", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.shop.delete({ id: 1 });
    expect(result).toEqual({ success: true });

    const { deleteShop } = await import("./db");
    expect(deleteShop).toHaveBeenCalledWith(1);
  });

  it("delete throws FORBIDDEN for non-owner", async () => {
    const { getShopById } = await import("./db");
    (getShopById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockShop,
      ownerId: 999,
    });

    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.shop.delete({ id: 1 })
    ).rejects.toThrow("Shop not found or access denied");
  });
});
