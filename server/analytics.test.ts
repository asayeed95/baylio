import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Analytics Router Tests
 *
 * Tests the cost analytics tRPC procedure.
 */

const now = new Date();

const { mockGetDb, resetDbMock, setDbResponses } = vi.hoisted(() => {
  let responses: Array<unknown[]> = [];
  let callIndex = 0;

  const resolveNext = () => {
    const result = responses[callIndex] ?? [];
    callIndex++;
    return result;
  };

  const createChain = (): any => {
    const chain: any = {};
    const methods = [
      "select",
      "from",
      "where",
      "limit",
      "offset",
      "orderBy",
      "groupBy",
    ];
    for (const method of methods) {
      chain[method] = vi.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: Function, reject?: Function) => {
      return Promise.resolve(resolveNext()).then(resolve, reject);
    };
    return chain;
  };

  const mockGetDb = vi.fn().mockImplementation(async () => {
    const db: any = {};
    db.select = vi.fn().mockImplementation(() => createChain());
    db.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
        onConflictDoUpdate: vi.fn().mockResolvedValue([{ id: 1 }]),
        then: (resolve: Function) => resolve([{ id: 1 }]),
      }),
    });
    db.update = vi.fn().mockReturnValue({
      set: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    });
    return db;
  });

  return {
    mockGetDb,
    resetDbMock: () => {
      responses = [];
      callIndex = 0;
    },
    setDbResponses: (r: Array<unknown[]>) => {
      responses = r;
      callIndex = 0;
    },
  };
});

vi.mock("./db", () => ({
  getDb: mockGetDb,
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
  getUserBySupabaseId: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const testUser: AuthenticatedUser = {
  id: 1,
  supabaseId: "test-analytics",
  email: "test@baylio.io",
  name: "Test User",
  loginMethod: "manus",
  role: "user",
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
};

function createContext(user: AuthenticatedUser | null = testUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("analytics", () => {
  beforeEach(() => resetDbMock());

  it("getCostSummary returns zeros when user has no shops", async () => {
    setDbResponses([
      [], // userShops query returns empty
    ]);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.analytics.getCostSummary();

    expect(result).toBeDefined();
    expect(result?.callCount).toBe(0);
    expect(result?.totalCost).toBe(0);
    expect(result?.grossMargin).toBe(0);
    expect(result?.dailyCalls).toEqual([]);
    expect(result?.recentCalls).toEqual([]);
  });

  it("getCostSummary computes costs from call data", async () => {
    setDbResponses([
      [{ id: 1 }], // userShops
      [{ callCount: 10, totalSeconds: 3000 }], // callStats (50 min)
      [{ tier: "pro" }], // activeSubs
      [
        { date: "2026-03-22", count: 5 },
        { date: "2026-03-23", count: 5 },
      ], // dailyCalls
      [], // recentCalls
    ]);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.analytics.getCostSummary();

    expect(result).toBeDefined();
    expect(result!.callCount).toBe(10);
    expect(result!.totalMinutes).toBe(50);
    // Twilio: 50 * 0.014 = 0.70
    expect(result!.twilioCost).toBe(0.7);
    // ElevenLabs: 50 * 600 * 0.00011 = 3.30
    expect(result!.elevenLabsCost).toBe(3.3);
    expect(result!.totalCost).toBe(4);
    expect(result!.revenue).toBe(349);
    expect(result!.grossMargin).toBeGreaterThan(95);
  });

  it("rejects unauthenticated requests", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.analytics.getCostSummary()).rejects.toThrow();
  });
});
