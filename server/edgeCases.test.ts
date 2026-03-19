import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Edge Case Tests
 *
 * Validates boundary conditions for Zod schemas and graceful handling
 * of missing / empty data across routers:
 *
 * - Shop name length boundaries (min, max, over-max, unicode)
 * - Contact message length boundaries (max, over-max)
 * - Null returns for missing agent config, subscription, notifications
 * - Empty grouped organizations
 */

// ─── Mock Data ──────────────────────────────────────────────────────────

const { mockShop } = vi.hoisted(() => {
  const now = new Date();
  return {
    mockShop: {
      id: 1,
      ownerId: 1,
      organizationId: null,
      name: "Edge Case Shop",
      phone: "(555) 000-0000",
      address: null,
      city: null,
      state: null,
      zip: null,
      timezone: "America/New_York",
      businessHours: null,
      serviceCatalog: null,
      isActive: true,
      twilioPhoneNumber: null,
      twilioPhoneSid: null,
      createdAt: now,
      updatedAt: now,
    },
  };
});

// ─── Mock ALL modules that appRouter imports ────────────────────────────

vi.mock("./db", () => ({
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
  createContactSubmission: vi.fn().mockResolvedValue(1),
}));

vi.mock("./services/twilioProvisioning", () => ({
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

vi.mock("./services/auditService", () => ({
  generateScorecard: vi.fn().mockResolvedValue(null),
  completeAudit: vi.fn().mockResolvedValue(null),
}));

// ─── Test Helpers ───────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const testUser: AuthenticatedUser = {
  id: 1,
  openId: "edge-case-openid",
  email: "edge@baylio.io",
  name: "Edge Tester",
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

// ─── Edge Case Tests ────────────────────────────────────────────────────

describe("Edge cases — Shop name validation", () => {
  it("rejects an empty name (min(1) constraint)", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.shop.create({ name: "" })
    ).rejects.toThrow();
  });

  it("accepts a name at exactly 255 characters (max length)", async () => {
    const caller = appRouter.createCaller(createContext());
    const longName = "A".repeat(255);
    const result = await caller.shop.create({ name: longName });
    expect(result.id).toBe(1);
  });

  it("rejects a name exceeding 255 characters", async () => {
    const caller = appRouter.createCaller(createContext());
    const tooLongName = "A".repeat(256);
    await expect(
      caller.shop.create({ name: tooLongName })
    ).rejects.toThrow();
  });

  it("accepts unicode characters in shop name (emoji and CJK)", async () => {
    const caller = appRouter.createCaller(createContext());

    // Emoji in name
    const emojiResult = await caller.shop.create({ name: "Auto Shop \u{1F697}\u{1F527}" });
    expect(emojiResult.id).toBe(1);

    // CJK characters
    const cjkResult = await caller.shop.create({ name: "\u81EA\u52D5\u8ECA\u5C4B" });
    expect(cjkResult.id).toBe(1);
  });
});

describe("Edge cases — Contact message length", () => {
  it("accepts a message at exactly 5000 characters (max limit)", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const maxMessage = "x".repeat(5000);
    const result = await caller.contact.submit({
      name: "Max Message",
      email: "max@example.com",
      message: maxMessage,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a message exceeding 5000 characters", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const overMessage = "x".repeat(5001);
    await expect(
      caller.contact.submit({
        name: "Over Limit",
        email: "over@example.com",
        message: overMessage,
      })
    ).rejects.toThrow();
  });
});

describe("Edge cases — Null / empty returns", () => {
  it("shop.getAgentConfig returns null for a shop with no agent config", async () => {
    const caller = appRouter.createCaller(createContext());
    const config = await caller.shop.getAgentConfig({ shopId: 1 });
    expect(config).toBeNull();
  });

  it("subscription.getByShop returns null for a shop with no subscription", async () => {
    const caller = appRouter.createCaller(createContext());
    const sub = await caller.subscription.getByShop({ shopId: 1 });
    expect(sub).toBeNull();
  });

  it("organization.getShopsGrouped returns empty grouped array when user has no orgs", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.organization.getShopsGrouped();
    expect(result.grouped).toHaveLength(0);
    expect(Array.isArray(result.grouped)).toBe(true);
    // standalone still has mockShop since getShopsByOwner returns [mockShop]
    expect(result.standalone).toHaveLength(1);
  });

  it("notification.list returns empty array for user with no notifications", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.list({});
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});
