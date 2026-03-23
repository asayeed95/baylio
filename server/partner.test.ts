import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Partner Router Tests
 *
 * Tests all partner tRPC procedures using the createCaller pattern.
 * Mocks getDb() to return a chainable mock query builder.
 *
 * Coverage:
 * - partner.getProfile
 * - partner.enroll
 * - partner.dashboard
 * - partner.listReferrals
 * - partner.getMyNetwork
 * - partner.requestPayout
 * - partner.getMyPayouts
 * - partner.updateSettings
 */

const now = new Date();

const { mockPartner, mockReferral, mockPayout } = vi.hoisted(() => {
  const now = new Date();
  return {
    mockPartner: {
      id: 1,
      userId: 1,
      referralCode: "ABC123XYZ0",
      commissionRate: "0.2000",
      tier: "bronze" as const,
      status: "active" as const,
      totalReferrals: 5,
      totalEarnings: "1200.00",
      pendingEarnings: "350.00",
      payoutMethod: "stripe" as const,
      payoutEmail: "test@baylio.io",
      companyName: "Test Partners LLC",
      website: "https://testpartners.com",
      notifyReferrals: true,
      notifyPayouts: true,
      notifyNewsletter: true,
      createdAt: now,
      updatedAt: now,
    },
    mockReferral: {
      id: 1,
      partnerId: 1,
      referredUserId: 2,
      referredShopId: 1,
      referredEmail: "shop@example.com",
      referredName: "Joe's Auto Shop",
      status: "subscribed" as const,
      subscriptionTier: "pro",
      monthlyValue: "349.00",
      commissionEarned: "69.80",
      convertedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    mockPayout: {
      id: 1,
      partnerId: 1,
      amount: "100.00",
      status: "completed" as const,
      payoutMethod: "stripe",
      payoutEmail: "test@baylio.io",
      transactionId: "tx_123",
      notes: null,
      requestedAt: now,
      processedAt: now,
      createdAt: now,
    },
  };
});

// Track which query we're on to return different results per chain
const { mockGetDb, resetDbMock, setDbResponses } = vi.hoisted(() => {
  let responses: Array<unknown[]> = [];
  let callIndex = 0;
  let mockValues = vi.fn().mockResolvedValue([{ insertId: 1 }]);

  const makeSetWhere: () => any = () => ({
    where: vi.fn().mockResolvedValue(undefined),
  });

  const resolveNext = () => {
    const result = responses[callIndex] ?? [];
    callIndex++;
    return result;
  };

  const createChainableDb = () => {
    // Each query chain is a thenable proxy so that `await db.select()...` works
    // and methods can be chained in any order
    const createChain = (): any => {
      let resolved = false;
      let resolvedValue: unknown[] | undefined;

      const chain: any = {};
      const methods = [
        "select", "from", "where", "limit", "offset",
        "orderBy", "groupBy",
      ];

      for (const method of methods) {
        chain[method] = vi.fn().mockReturnValue(chain);
      }

      // Make the chain thenable — resolves with next response
      chain.then = (resolve: Function, reject?: Function) => {
        if (!resolved) {
          resolvedValue = resolveNext();
          resolved = true;
        }
        return Promise.resolve(resolvedValue).then(resolve, reject);
      };

      return chain;
    };

    const db: any = {};
    // select() starts a new query chain
    db.select = vi.fn().mockImplementation(() => createChain());
    db.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((...args: any[]) => mockValues(...args)),
    });
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation(() => makeSetWhere()),
    });

    return db;
  };

  const mockGetDb = vi.fn().mockImplementation(async () => createChainableDb());

  return {
    mockGetDb,
    resetDbMock: () => {
      responses = [];
      callIndex = 0;
      mockValues = vi.fn().mockResolvedValue([{ insertId: 1 }]);
    },
    setDbResponses: (r: Array<unknown[]>, valuesResult?: any) => {
      responses = r;
      callIndex = 0;
      if (valuesResult) {
        mockValues = vi.fn().mockResolvedValue(valuesResult);
      }
    },
  };
});

// Mock the db module — getDb is used by the partner router directly
vi.mock("./db", () => ({
  getDb: mockGetDb,
  // Existing exports to prevent other routers from breaking
  getShopsByOwner: vi.fn().mockResolvedValue([]),
  getShopById: vi.fn().mockResolvedValue(null),
  createShop: vi.fn(),
  updateShop: vi.fn(),
  deleteShop: vi.fn(),
  getAgentConfigByShop: vi.fn(),
  upsertAgentConfig: vi.fn(),
  getSubscriptionByShop: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  getUsageBySubscription: vi.fn().mockResolvedValue([]),
  getCallLogsByShop: vi.fn().mockResolvedValue([]),
  getCallLogCountByShop: vi.fn().mockResolvedValue(0),
  getShopAnalytics: vi.fn().mockResolvedValue(null),
  getMissedCallAudits: vi.fn().mockResolvedValue([]),
  createMissedCallAudit: vi.fn(),
  updateMissedCallAudit: vi.fn(),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  getOrganizationsByOwner: vi.fn().mockResolvedValue([]),
  createOrganization: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const testUser: AuthenticatedUser = {
  id: 1,
  openId: "test-partner-openid",
  email: "test@baylio.io",
  name: "Test Partner",
  loginMethod: "manus",
  role: "user",
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
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

// ─── Tests ──────────────────────────────────────────────────────────

describe("partner", () => {
  beforeEach(() => {
    resetDbMock();
  });

  describe("getProfile", () => {
    it("returns null when user has no partner profile", async () => {
      setDbResponses([[]]);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.getProfile();
      expect(result).toBeNull();
    });

    it("returns partner profile when it exists", async () => {
      setDbResponses([[mockPartner]]);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.getProfile();
      expect(result).toBeDefined();
      expect(result?.referralCode).toBe("ABC123XYZ0");
      expect(result?.tier).toBe("bronze");
    });

    it("rejects unauthenticated requests", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(caller.partner.getProfile()).rejects.toThrow();
    });
  });

  describe("enroll", () => {
    it("creates a new partner profile with referral code", async () => {
      setDbResponses(
        [[]], // existing check returns empty
        [{ insertId: 42 }]
      );

      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.enroll({
        companyName: "My Agency",
      });

      expect(result).toBeDefined();
      expect(result.referralCode).toBeDefined();
      expect(result.referralCode.length).toBe(10);
    });

    it("returns existing profile if already enrolled", async () => {
      setDbResponses([[mockPartner]]);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.enroll({});

      expect(result.id).toBe(1);
      expect(result.referralCode).toBe("ABC123XYZ0");
    });
  });

  describe("dashboard", () => {
    it("returns null when user is not a partner", async () => {
      setDbResponses([[]]);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.dashboard();
      expect(result).toBeNull();
    });

    it("returns dashboard stats for enrolled partner", async () => {
      setDbResponses([
        [mockPartner],
        [
          {
            total: 5,
            pending: 1,
            signedUp: 1,
            subscribed: 3,
            churned: 0,
            totalCommission: "350.00",
            totalMonthlyValue: "1047.00",
          },
        ],
      ]);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.dashboard();

      expect(result).toBeDefined();
      expect(result?.partner.referralCode).toBe("ABC123XYZ0");
      expect(result?.stats.totalReferrals).toBe(5);
      expect(result?.stats.activeSubscriptions).toBe(3);
      expect(result?.stats.conversionRate).toBe(60);
    });
  });

  describe("listReferrals", () => {
    it("returns empty list when not a partner", async () => {
      setDbResponses([[]]);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.listReferrals();
      expect(result.referrals).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("returns referrals with pagination", async () => {
      setDbResponses([
        [mockPartner],
        [mockReferral], // orderBy resolves
        [{ count: 1 }], // limit resolves (count query)
      ]);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.listReferrals({
        status: "all",
        limit: 20,
        offset: 0,
      });

      expect(result.referrals.length).toBe(1);
      expect(result.referrals[0].referredName).toBe("Joe's Auto Shop");
    });
  });

  describe("getMyNetwork", () => {
    it("returns empty network when not a partner", async () => {
      setDbResponses([[]]);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.getMyNetwork();
      expect(result.network).toEqual([]);
      expect(result.totalMRR).toBe(0);
    });

    it("returns network with MRR calculation", async () => {
      const networkMember = {
        referralId: 1,
        referredName: "Joe's Auto Shop",
        referredEmail: "joe@example.com",
        status: "subscribed",
        subscriptionTier: "pro",
        monthlyValue: "349.00",
        commissionEarned: "69.80",
        convertedAt: now,
        createdAt: now,
      };
      setDbResponses([
        [mockPartner],
        [networkMember], // orderBy resolves
      ]);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.getMyNetwork();

      expect(result.network.length).toBe(1);
      expect(result.totalMRR).toBe(349);
    });
  });

  describe("requestPayout", () => {
    it("rejects payout below minimum via zod validation", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(
        caller.partner.requestPayout({ amount: 25 })
      ).rejects.toThrow();
    });

    it("rejects payout exceeding available balance", async () => {
      setDbResponses([[mockPartner]]); // has $350 pending
      const caller = appRouter.createCaller(createContext());
      await expect(
        caller.partner.requestPayout({ amount: 500 })
      ).rejects.toThrow();
    });

    it("creates payout for valid amount", async () => {
      setDbResponses(
        [[mockPartner]],
        [{ insertId: 5 }]
      );

      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.requestPayout({ amount: 100 });

      expect(result.payoutId).toBe(5);
      expect(result.amount).toBe(100);
    });
  });

  describe("getMyPayouts", () => {
    it("returns empty list when not a partner", async () => {
      setDbResponses([[]]);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.getMyPayouts();
      expect(result).toEqual([]);
    });

    it("returns payout history", async () => {
      setDbResponses([
        [mockPartner],
        [mockPayout], // orderBy resolves
      ]);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.getMyPayouts();
      expect(result.length).toBe(1);
      expect(result[0].amount).toBe("100.00");
    });
  });

  describe("updateSettings", () => {
    it("rejects when not enrolled", async () => {
      setDbResponses([[]]);
      const caller = appRouter.createCaller(createContext());
      await expect(
        caller.partner.updateSettings({ companyName: "New Name" })
      ).rejects.toThrow(/not found/i);
    });

    it("updates partner settings successfully", async () => {
      setDbResponses([[mockPartner]]);
      const caller = appRouter.createCaller(createContext());
      const result = await caller.partner.updateSettings({
        companyName: "Updated Agency",
        payoutMethod: "paypal",
        notifyReferrals: false,
      });

      expect(result.success).toBe(true);
    });

    it("validates payout email format via zod", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(
        caller.partner.updateSettings({ payoutEmail: "not-an-email" })
      ).rejects.toThrow();
    });
  });
});
