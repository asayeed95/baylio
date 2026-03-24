import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Integration Tests — Sprint 4
 *
 * Tests all integration features:
 * 1. Schema: shopIntegrations, integrationSyncLogs, scorecardData, smsFollowUpEnabled, smsOptOut
 * 2. Integration router: listConnected, disconnect, saveSettings, getSyncLogs
 * 3. Calendar service: createAppointment graceful fallback
 * 4. Sheets service: syncCallToSheet graceful fallback
 * 5. HubSpot service: syncCallerToHubspot graceful fallback
 * 6. Shopmonkey service: createWorkOrder graceful fallback
 * 7. Demo service: seedDemoShop importable
 * 8. Call scorecard: scorecardData column exists
 */

const now = new Date();

const { mockShop } = vi.hoisted(() => ({
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
    smsFollowUpEnabled: true,
    twilioPhoneNumber: null,
    twilioPhoneSid: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}));

// Track chainable DB responses
const { mockGetDb, resetDbMock, setDbResponses } = vi.hoisted(() => {
  let responses: Array<unknown[]> = [];
  let callIndex = 0;
  const mockValues = vi.fn().mockResolvedValue([{ insertId: 1 }]);

  const makeSetWhere: () => any = () => ({
    where: vi.fn().mockResolvedValue(undefined),
  });

  const resolveNext = () => {
    const result = responses[callIndex] ?? [];
    callIndex++;
    return result;
  };

  const createChainableDb = () => {
    const createChain = (): any => {
      let resolved = false;
      let resolvedValue: unknown[] | undefined;

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
        if (!resolved) {
          resolvedValue = resolveNext();
          resolved = true;
        }
        return Promise.resolve(resolvedValue).then(resolve, reject);
      };

      return chain;
    };

    const db: any = {};
    db.select = vi.fn().mockImplementation(() => createChain());
    db.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockImplementation((...args: any[]) => ({
        onDuplicateKeyUpdate: vi.fn().mockResolvedValue([{ insertId: 1 }]),
        then: (resolve: Function) => resolve([{ insertId: 1 }]),
      })),
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
    },
    setDbResponses: (r: Array<unknown[]>) => {
      responses = r;
      callIndex = 0;
    },
  };
});

// Mock the db module
vi.mock("./db", () => ({
  getDb: mockGetDb,
  getShopsByOwner: vi.fn().mockResolvedValue([mockShop]),
  getShopById: vi.fn().mockResolvedValue(mockShop),
  createShop: vi.fn().mockResolvedValue(1),
  updateShop: vi.fn().mockResolvedValue(undefined),
  deleteShop: vi.fn().mockResolvedValue(undefined),
  getAgentConfigByShop: vi.fn().mockResolvedValue(null),
  upsertAgentConfig: vi.fn().mockResolvedValue(1),
  getSubscriptionByShop: vi.fn().mockResolvedValue(null),
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

// Mock Google APIs
vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: vi.fn() },
    calendar: vi.fn(),
    sheets: vi.fn(),
    oauth2: vi.fn(),
  },
}));

// Mock HubSpot
vi.mock("@hubspot/api-client", () => ({
  Client: vi.fn().mockImplementation(() => ({
    crm: {
      contacts: {
        searchApi: { doSearch: vi.fn().mockResolvedValue({ results: [] }) },
        basicApi: {
          create: vi.fn().mockResolvedValue({ id: "123" }),
          update: vi.fn().mockResolvedValue({}),
        },
      },
      objects: {
        notes: {
          basicApi: { create: vi.fn().mockResolvedValue({}) },
        },
      },
    },
  })),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const testUser: AuthenticatedUser = {
  id: 1,
  openId: "test-user-openid",
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
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── 1. Schema Tests ──────────────────────────────────────────────

describe("Schema — Integration tables", () => {
  it("shopIntegrations table is exported from schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.shopIntegrations).toBeDefined();
    expect(typeof schema.shopIntegrations).toBe("object");
  });

  it("integrationSyncLogs table is exported from schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.integrationSyncLogs).toBeDefined();
    expect(typeof schema.integrationSyncLogs).toBe("object");
  });

  it("shopIntegrations has required columns (provider, accessToken, isActive)", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.shopIntegrations;
    // Drizzle tables have column definitions
    expect((table as any).provider).toBeDefined();
    expect((table as any).accessToken).toBeDefined();
    expect((table as any).isActive).toBeDefined();
    expect((table as any).shopId).toBeDefined();
  });

  it("integrationSyncLogs has required columns (provider, action, status)", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.integrationSyncLogs;
    expect((table as any).provider).toBeDefined();
    expect((table as any).action).toBeDefined();
    expect((table as any).status).toBeDefined();
    expect((table as any).errorMessage).toBeDefined();
  });
});

// ─── 2. Integration Router Tests ──────────────────────────────────

describe("Integration Router", () => {
  beforeEach(() => resetDbMock());

  it("integration.listConnected returns integrations for a shop", async () => {
    setDbResponses([
      [{ id: 1, shopId: 1, provider: "hubspot", isActive: true }],
    ]);
    const caller = appRouter.createCaller(createContext());
    const result = await caller.integration.listConnected({ shopId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("integration.listConnected returns empty for unauthorized shop", async () => {
    const { getShopById } = await import("./db");
    (getShopById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockShop,
      ownerId: 999,
    });

    const caller = appRouter.createCaller(createContext());
    const result = await caller.integration.listConnected({ shopId: 1 });
    expect(result).toEqual([]);
  });

  it("integration.disconnect deactivates an integration", async () => {
    setDbResponses([]);
    const caller = appRouter.createCaller(createContext());
    const result = await caller.integration.disconnect({
      integrationId: 1,
      shopId: 1,
    });
    expect(result).toEqual({ success: true });
  });

  it("integration.disconnect rejects for non-owned shop", async () => {
    const { getShopById } = await import("./db");
    (getShopById as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...mockShop,
      ownerId: 999,
    });

    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.integration.disconnect({ integrationId: 1, shopId: 1 })
    ).rejects.toThrow("Shop not found");
  });

  it("integration.saveSettings saves provider settings", async () => {
    setDbResponses([]);
    const caller = appRouter.createCaller(createContext());
    const result = await caller.integration.saveSettings({
      shopId: 1,
      provider: "hubspot",
      accessToken: "test-key",
    });
    expect(result).toEqual({ success: true });
  });

  it("integration.getSyncLogs returns sync log entries", async () => {
    setDbResponses([
      [
        {
          id: 1,
          shopId: 1,
          provider: "hubspot",
          action: "sync_contact",
          status: "success",
          createdAt: now,
        },
      ],
    ]);
    const caller = appRouter.createCaller(createContext());
    const result = await caller.integration.getSyncLogs({ shopId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── 3. Calendar Service Tests ────────────────────────────────────

describe("Calendar Service", () => {
  beforeEach(() => resetDbMock());

  it("createAppointment returns gracefully when not connected", async () => {
    setDbResponses([[]]); // No integration found
    const { createAppointment } = await import("./services/calendarService");
    const result = await createAppointment(1, {
      customerName: "John",
      customerPhone: "+15551234567",
      service: "Oil Change",
      dateTime: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not connected");
  });

  it("createAppointment is importable and a function", async () => {
    const mod = await import("./services/calendarService");
    expect(typeof mod.createAppointment).toBe("function");
  });

  it("createAppointment accepts duration and notes params", async () => {
    setDbResponses([[]]); // No integration
    const { createAppointment } = await import("./services/calendarService");
    const result = await createAppointment(1, {
      customerName: "Jane",
      customerPhone: "+15559999999",
      service: "Brake Repair",
      dateTime: new Date().toISOString(),
      duration: 90,
      notes: "Customer prefers afternoon.",
    });
    expect(result.success).toBe(false);
  });
});

// ─── 4. Sheets Service Tests ─────────────────────────────────────

describe("Sheets Service", () => {
  beforeEach(() => resetDbMock());

  it("syncCallToSheet returns gracefully when not connected", async () => {
    setDbResponses([[]]); // No integration
    const { syncCallToSheet } = await import("./services/sheetsService");
    const result = await syncCallToSheet(1, {
      createdAt: new Date(),
      callerName: "John",
      callerPhone: "+15551234567",
      duration: 120,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not connected");
  });

  it("syncCallToSheet is importable and a function", async () => {
    const mod = await import("./services/sheetsService");
    expect(typeof mod.syncCallToSheet).toBe("function");
  });

  it("syncCallToSheet handles null createdAt", async () => {
    setDbResponses([[]]); // No integration
    const { syncCallToSheet } = await import("./services/sheetsService");
    const result = await syncCallToSheet(1, {
      createdAt: null,
      callerName: null,
    });
    expect(result.success).toBe(false);
  });
});

// ─── 5. HubSpot Service Tests ────────────────────────────────────

describe("HubSpot Service", () => {
  beforeEach(() => resetDbMock());

  it("syncCallerToHubspot returns gracefully when no API key", async () => {
    setDbResponses([[]]); // No integration
    // Remove env var to ensure fallback fails
    const originalKey = process.env.HUBSPOT_API_KEY;
    delete process.env.HUBSPOT_API_KEY;

    const { syncCallerToHubspot } = await import("./services/hubspotService");
    const result = await syncCallerToHubspot(1, {
      phone: "+15551234567",
      name: "John",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not connected");

    if (originalKey) process.env.HUBSPOT_API_KEY = originalKey;
  });

  it("syncCallerToHubspot is importable and a function", async () => {
    const mod = await import("./services/hubspotService");
    expect(typeof mod.syncCallerToHubspot).toBe("function");
  });

  it("syncCallerToHubspot accepts optional fields", async () => {
    setDbResponses([[]]); // No integration
    delete process.env.HUBSPOT_API_KEY;
    const { syncCallerToHubspot } = await import("./services/hubspotService");
    const result = await syncCallerToHubspot(1, {
      phone: "+15551234567",
      name: "Jane",
      email: "jane@example.com",
      service: "Oil Change",
      callSummary: "Asked about pricing",
      duration: 180,
    });
    expect(result.success).toBe(false);
  });
});

// ─── 6. Shopmonkey Service Tests ─────────────────────────────────

describe("Shopmonkey Service", () => {
  beforeEach(() => resetDbMock());

  it("createWorkOrder returns gracefully when not connected", async () => {
    setDbResponses([[]]); // No integration
    const { createWorkOrder } = await import("./services/shopmonkeyService");
    const result = await createWorkOrder(1, {
      customerName: "John",
      customerPhone: "+15551234567",
      service: "Brake Repair",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("not connected");
  });

  it("createWorkOrder is importable and a function", async () => {
    const mod = await import("./services/shopmonkeyService");
    expect(typeof mod.createWorkOrder).toBe("function");
  });

  it("createWorkOrder accepts vehicle info and notes", async () => {
    setDbResponses([[]]); // No integration
    const { createWorkOrder } = await import("./services/shopmonkeyService");
    const result = await createWorkOrder(1, {
      customerName: "Jane",
      customerPhone: "+15559999999",
      vehicleInfo: { year: "2020", make: "Toyota", model: "Camry" },
      service: "Oil Change",
      appointmentDate: new Date().toISOString(),
      notes: "Regular maintenance",
    });
    expect(result.success).toBe(false);
  });
});

// ─── 7. Demo Service Tests ───────────────────────────────────────

describe("Demo Service", () => {
  it("seedDemoShop is importable and a function", async () => {
    const mod = await import("./services/demoService");
    expect(typeof mod.seedDemoShop).toBe("function");
  });

  it("isDemoShop is importable and a function", async () => {
    const mod = await import("./services/demoService");
    expect(typeof mod.isDemoShop).toBe("function");
  });

  it("shop.createDemo endpoint exists on the router", async () => {
    const caller = appRouter.createCaller(createContext());
    // The procedure should exist; we can't fully run it because it hits the DB,
    // but we can verify it's callable (will fail at the DB level).
    expect(typeof caller.shop.createDemo).toBe("function");
  });
});

// ─── 8. Call Scorecard Schema Tests ──────────────────────────────

describe("Call Scorecard", () => {
  it("callLogs schema has scorecardData column", async () => {
    const schema = await import("../drizzle/schema");
    expect((schema.callLogs as any).scorecardData).toBeDefined();
  });

  it("shops schema has smsFollowUpEnabled column", async () => {
    const schema = await import("../drizzle/schema");
    expect((schema.shops as any).smsFollowUpEnabled).toBeDefined();
  });

  it("callerProfiles schema has smsOptOut column", async () => {
    const schema = await import("../drizzle/schema");
    expect((schema.callerProfiles as any).smsOptOut).toBeDefined();
  });
});
