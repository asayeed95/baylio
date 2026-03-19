import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Baylio Router Tests
 * 
 * Tests all tRPC procedures using the createCaller pattern.
 * Database calls are mocked to test router logic in isolation.
 * 
 * Coverage:
 * - auth.me / auth.logout
 * - shop.list / shop.create / shop.update / shop.delete / shop.getById
 * - shop.getAgentConfig / shop.saveAgentConfig
 * - calls.list / calls.analytics / calls.audits / calls.createAudit / calls.updateAudit
 * - notification.list / notification.markRead / notification.markAllRead / notification.unreadCount
 * - subscription.getByShop / subscription.create / subscription.changeTier / subscription.getTierConfig
 * - organization.list / organization.create / organization.getShopsGrouped
 */

// ─── Mock Data Factories (must be inside vi.mock or use vi.hoisted) ─────

const { mockShop, mockAgentConfig, mockSubscription, mockNotification, mockOrg, mockCallLog } = vi.hoisted(() => {
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
    mockNotification: {
      id: 1,
      userId: 1,
      shopId: 1,
      type: "new_call" as const,
      title: "New Customer Call",
      message: "A customer called about brake service.",
      isRead: false,
      metadata: null,
      createdAt: now,
    },
    mockOrg: {
      id: 1,
      ownerId: 1,
      name: "Test Auto Group",
      createdAt: now,
      updatedAt: now,
    },
    mockCallLog: {
      id: 1,
      shopId: 1,
      callSid: "CA123",
      callerPhone: "+15551234567",
      callerName: "John Doe",
      direction: "inbound" as const,
      status: "completed" as const,
      duration: 180,
      startedAt: now,
      endedAt: now,
      recordingUrl: null,
      transcription: "Customer asked about oil change pricing.",
      summary: "Oil change inquiry",
      customerIntent: "service_inquiry",
      sentimentScore: "0.85",
      appointmentBooked: true,
      upsellAttempted: true,
      upsellAccepted: false,
      serviceRecommended: "Oil Change",
      estimatedRevenue: "49.99",
      qualityFlags: null,
      createdAt: now,
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
  getCallLogsByShop: vi.fn().mockResolvedValue([mockCallLog]),
  getCallLogCountByShop: vi.fn().mockResolvedValue(1),
  getShopAnalytics: vi.fn().mockResolvedValue({
    totalCalls: 150,
    answeredCalls: 140,
    missedCalls: 10,
    avgDuration: 195,
    appointmentsBooked: 45,
    estimatedRevenue: "12500.00",
  }),
  getMissedCallAudits: vi.fn().mockResolvedValue([]),
  createMissedCallAudit: vi.fn().mockResolvedValue(1),
  updateMissedCallAudit: vi.fn().mockResolvedValue(undefined),
  getNotificationsByUser: vi.fn().mockResolvedValue([mockNotification]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
  getOrganizationsByOwner: vi.fn().mockResolvedValue([mockOrg]),
  createOrganization: vi.fn().mockResolvedValue(1),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  createContactSubmission: vi.fn().mockResolvedValue(1),
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

// ─── Auth Tests ─────────────────────────────────────────────────────────

describe("auth", () => {
  it("auth.me returns the current user", async () => {
    const caller = appRouter.createCaller(createContext(testUser));
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-openid");
    expect(result?.email).toBe("test@baylio.io");
  });

  it("auth.me returns null for unauthenticated users", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("auth.logout clears the session cookie", async () => {
    const ctx = createContext(testUser);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalled();
  });
});

// ─── Shop Tests ─────────────────────────────────────────────────────────

describe("shop", () => {
  it("shop.list returns shops for the authenticated user", async () => {
    const caller = appRouter.createCaller(createContext());
    const shops = await caller.shop.list();
    expect(shops).toHaveLength(1);
    expect(shops[0].name).toBe("Test Auto Shop");
  });

  it("shop.list requires authentication", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.shop.list()).rejects.toThrow();
  });

  it("shop.getById returns a shop owned by the user", async () => {
    const caller = appRouter.createCaller(createContext());
    const shop = await caller.shop.getById({ id: 1 });
    expect(shop).toBeDefined();
    expect(shop?.name).toBe("Test Auto Shop");
    expect(shop?.city).toBe("Austin");
  });

  it("shop.create creates a new shop and returns its id", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.shop.create({
      name: "New Auto Shop",
      phone: "(555) 999-0000",
      city: "Dallas",
      state: "TX",
    });
    expect(result.id).toBe(1);
  });

  it("shop.update updates shop data", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.shop.update({
      id: 1,
      data: { name: "Updated Auto Shop" },
    });
    expect(result).toEqual({ success: true });
  });

  it("shop.delete removes a shop", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.shop.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("shop.getAgentConfig returns agent config for a shop", async () => {
    const caller = appRouter.createCaller(createContext());
    const config = await caller.shop.getAgentConfig({ shopId: 1 });
    expect(config).toBeDefined();
    expect(config?.voiceName).toBe("Rachel");
    expect(config?.agentName).toBe("Baylio");
  });

  it("shop.saveAgentConfig upserts agent configuration", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.shop.saveAgentConfig({
      shopId: 1,
      voiceId: "voice_456",
      voiceName: "Sarah",
      agentName: "Baylio Pro",
      systemPrompt: "You are a professional auto shop assistant.",
      greeting: "Welcome to our shop!",
      upsellEnabled: true,
      confidenceThreshold: "0.85",
      maxUpsellsPerCall: 2,
      language: "en",
    });
    expect(result.id).toBe(1);
  });
});

// ─── Call Logs Tests ────────────────────────────────────────────────────

describe("calls", () => {
  it("calls.list returns call logs for a shop", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.calls.list({ shopId: 1 });
    expect(result.calls).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.calls[0].callerPhone).toBe("+15551234567");
  });

  it("calls.list returns empty for unauthorized shop", async () => {
    const { getShopById } = await import("./db");
    (getShopById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ...mockShop, ownerId: 999 });
    
    const caller = appRouter.createCaller(createContext());
    const result = await caller.calls.list({ shopId: 1 });
    expect(result.calls).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("calls.analytics returns analytics data", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.calls.analytics({ shopId: 1 });
    expect(result).toBeDefined();
    expect(result?.totalCalls).toBe(150);
    expect(result?.answeredCalls).toBe(140);
    expect(result?.appointmentsBooked).toBe(45);
  });

  it("calls.audits returns missed call audits", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.calls.audits({ shopId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("calls.createAudit creates a new audit", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.calls.createAudit({
      shopId: 1,
      prospectName: "Joe's Garage",
      prospectPhone: "(555) 111-2222",
    });
    expect(result.id).toBe(1);
  });

  it("calls.updateAudit updates audit data", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.calls.updateAudit({
      id: 1,
      data: {
        status: "completed",
        totalMissedCalls: 15,
        estimatedLostRevenue: "4500.00",
      },
    });
    expect(result).toEqual({ success: true });
  });
});

// ─── Notification Tests ─────────────────────────────────────────────────

describe("notification", () => {
  it("notification.list returns notifications for the user", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.list({});
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("New Customer Call");
    expect(result[0].isRead).toBe(false);
  });

  it("notification.unreadCount returns the count of unread notifications", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.unreadCount();
    expect(result.count).toBe(1);
  });

  it("notification.markRead marks a notification as read", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.markRead({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("notification.markAllRead marks all notifications as read", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.markAllRead();
    expect(result).toEqual({ success: true });
  });

  it("notification.list requires authentication", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.notification.list({})).rejects.toThrow();
  });
});

// ─── Subscription Tests ─────────────────────────────────────────────────

describe("subscription", () => {
  it("subscription.getByShop returns subscription with overage calculation", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.getByShop({ shopId: 1 });
    expect(result).toBeDefined();
    expect(result?.tier).toBe("pro");
    expect(result?.usagePercent).toBe(27); // 200/750 = 26.67 → 27
    expect(result?.overageMinutes).toBe(0); // 200 < 750
    expect(result?.overageCharge).toBe("0.00");
  });

  it("subscription.getByShop calculates overage correctly", async () => {
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

  it("subscription.create creates a new subscription", async () => {
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

  it("subscription.create rejects duplicate subscriptions", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.subscription.create({ shopId: 1, tier: "starter" })
    ).rejects.toThrow("Subscription already exists");
  });

  it("subscription.changeTier upgrades the tier", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.changeTier({
      shopId: 1,
      newTier: "elite",
    });
    expect(result.success).toBe(true);
    expect(result.newTier).toBe("elite");
    expect(result.tierConfig.monthlyPrice).toBe(599);
  });

  it("subscription.getTierConfig returns all tier configurations", async () => {
    const caller = appRouter.createCaller(createContext());
    const config = await caller.subscription.getTierConfig();
    expect(config.starter.monthlyPrice).toBe(199);
    expect(config.pro.monthlyPrice).toBe(349);
    expect(config.elite.monthlyPrice).toBe(599);
    expect(config.starter.includedMinutes).toBe(300);
    expect(config.pro.includedMinutes).toBe(750);
    expect(config.elite.includedMinutes).toBe(1500);
  });

  it("subscription.listAll returns all shop subscriptions", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.subscription.listAll();
    expect(result).toHaveLength(1);
    expect(result[0].shop.name).toBe("Test Auto Shop");
    expect(result[0].subscription).toBeDefined();
  });
});

// ─── Organization Tests ─────────────────────────────────────────────────

describe("organization", () => {
  it("organization.list returns organizations for the user", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.organization.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Auto Group");
  });

  it("organization.create creates a new organization", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.organization.create({ name: "New Group" });
    expect(result.id).toBe(1);
  });

  it("organization.getShopsGrouped returns grouped and standalone shops", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.organization.getShopsGrouped();
    expect(result.grouped).toHaveLength(1);
    expect(result.standalone).toHaveLength(1); // mockShop has organizationId: null
  });

  it("organization.list requires authentication", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.organization.list()).rejects.toThrow();
  });
});
