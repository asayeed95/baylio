import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Notification Router Tests
 *
 * Tests all tRPC procedures on the notificationRouter in isolation.
 * Database calls are mocked via vi.mock.
 *
 * Coverage:
 * - notification.list (all, unreadOnly filter)
 * - notification.unreadCount
 * - notification.markRead
 * - notification.markAllRead
 * - Authentication requirement on all procedures
 */

// ─── Mock Data Factories ────────────────────────────────────────────────

const { mockNotificationUnread, mockNotificationRead } = vi.hoisted(() => {
  const now = new Date();
  return {
    mockNotificationUnread: {
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
    mockNotificationRead: {
      id: 2,
      userId: 1,
      shopId: 1,
      type: "weekly_summary" as const,
      title: "Weekly Performance Summary",
      message: "Your shop handled 42 calls this week.",
      isRead: true,
      metadata: null,
      createdAt: now,
    },
  };
});

// ─── Mock Modules ───────────────────────────────────────────────────────

const mockGetNotificationsByUser = vi.hoisted(() =>
  vi.fn().mockImplementation((_userId: number, unreadOnly: boolean) => {
    const all = [mockNotificationUnread, mockNotificationRead];
    if (unreadOnly) return Promise.resolve(all.filter((n) => !n.isRead));
    return Promise.resolve(all);
  })
);

const mockMarkNotificationRead = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);

const mockMarkAllNotificationsRead = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined)
);

vi.mock("./db", () => ({
  getShopsByOwner: vi.fn().mockResolvedValue([]),
  getShopById: vi.fn().mockResolvedValue(null),
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
  getShopAnalytics: vi.fn().mockResolvedValue({}),
  getMissedCallAudits: vi.fn().mockResolvedValue([]),
  createMissedCallAudit: vi.fn().mockResolvedValue(1),
  updateMissedCallAudit: vi.fn().mockResolvedValue(undefined),
  getNotificationsByUser: mockGetNotificationsByUser,
  markNotificationRead: mockMarkNotificationRead,
  markAllNotificationsRead: mockMarkAllNotificationsRead,
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

describe("notification", () => {
  // 1. list returns notifications for authenticated user
  it("list returns notifications for authenticated user", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.list({});
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("New Customer Call");
    expect(result[1].title).toBe("Weekly Performance Summary");
  });

  // 2. list with unreadOnly=true filters notifications
  it("list with unreadOnly=true filters notifications", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.list({ unreadOnly: true });
    expect(result).toHaveLength(1);
    expect(result[0].isRead).toBe(false);
    expect(result[0].title).toBe("New Customer Call");
  });

  // 3. unreadCount returns correct count
  it("unreadCount returns correct count", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.unreadCount();
    expect(result.count).toBe(1); // only 1 unread notification
  });

  // 4. markRead marks a specific notification
  it("markRead marks a specific notification", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.markRead({ id: 1 });
    expect(result).toEqual({ success: true });
    expect(mockMarkNotificationRead).toHaveBeenCalledWith(1);
  });

  // 5. markAllRead marks all notifications for user
  it("markAllRead marks all notifications for user", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.notification.markAllRead();
    expect(result).toEqual({ success: true });
    expect(mockMarkAllNotificationsRead).toHaveBeenCalledWith(testUser.id);
  });

  // 6. All procedures require authentication
  describe("all procedures require authentication", () => {
    it("list requires authentication", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(caller.notification.list({})).rejects.toThrow();
    });

    it("unreadCount requires authentication", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(caller.notification.unreadCount()).rejects.toThrow();
    });

    it("markRead requires authentication", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(caller.notification.markRead({ id: 1 })).rejects.toThrow();
    });

    it("markAllRead requires authentication", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(caller.notification.markAllRead()).rejects.toThrow();
    });
  });
});
