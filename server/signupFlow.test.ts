import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Signup Flow Regression Tests
 *
 * Tests the critical path: new user → create shop → save agent config →
 * provision ElevenLabs agent → verify agent status.
 *
 * These tests verify that a new shop owner can go from zero to receiving
 * AI-answered calls without hitting silent failures.
 */

const now = new Date();

const { mockGetDb, resetDbMock, setDbResponses } = vi.hoisted(() => {
  let responses: Array<unknown[]> = [];
  let callIndex = 0;
  let mockReturningResult = [{ id: 1 }];

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
      values: vi
        .fn()
        .mockImplementation((...args: any[]) => ({
          returning: vi.fn().mockResolvedValue(mockReturningResult),
          onConflictDoUpdate: vi.fn().mockResolvedValue(mockReturningResult),
          then: (resolve: Function) => resolve(mockReturningResult),
        })),
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
      mockReturningResult = [{ id: 1 }];
    },
    setDbResponses: (r: Array<unknown[]>, valuesResult?: any) => {
      responses = r;
      callIndex = 0;
      if (valuesResult) {
        mockReturningResult = valuesResult;
      }
    },
  };
});

// Mock db module
vi.mock("./db", () => ({
  getDb: mockGetDb,
  getShopsByOwner: vi.fn().mockResolvedValue([]),
  getShopById: vi.fn(),
  createShop: vi.fn().mockResolvedValue(1),
  updateShop: vi.fn(),
  deleteShop: vi.fn(),
  getAgentConfigByShop: vi.fn(),
  upsertAgentConfig: vi.fn().mockResolvedValue(1),
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
  createContactSubmission: vi.fn(),
}));

// Mock ElevenLabs service
vi.mock("./services/elevenLabsService", () => ({
  createConversationalAgent: vi.fn().mockResolvedValue({
    agent_id: "agent_test_new_123",
    name: "Baylio — Test Shop (Baylio)",
    conversation_config: {},
  }),
  updateConversationalAgent: vi.fn().mockResolvedValue({
    agent_id: "agent_test_existing_456",
    name: "Baylio — Test Shop (Baylio)",
    conversation_config: {},
  }),
  listVoices: vi.fn().mockResolvedValue([]),
  deleteConversationalAgent: vi.fn(),
  getAgent: vi.fn(),
  getSubscriptionInfo: vi.fn(),
  getConversationHistory: vi.fn().mockResolvedValue([]),
}));

// Mock Twilio provisioning
vi.mock("./services/twilioProvisioning", () => ({
  validateTwilioCredentials: vi.fn(),
  searchAvailableNumbers: vi.fn().mockResolvedValue([]),
  purchasePhoneNumber: vi.fn(),
  releasePhoneNumber: vi.fn(),
  getAccountBalance: vi.fn(),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const testUser: AuthenticatedUser = {
  id: 1,
  supabaseId: "new-shop-owner",
  email: "owner@testshop.com",
  name: "New Shop Owner",
  loginMethod: "manus",
  role: "user",
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
};

const mockShop = {
  id: 1,
  ownerId: 1,
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
  twilioPhoneNumber: "+18445551234",
  twilioPhoneSid: "PN_test_123",
  createdAt: now,
  updatedAt: now,
  organizationId: null,
};

const mockAgentConfig = {
  id: 1,
  shopId: 1,
  ownerId: 1,
  voiceId: "cjVigY5qzO86Huf0OWal",
  voiceName: "Charlie",
  agentName: "Alex",
  systemPrompt: "You are Alex, the AI receptionist.",
  greeting: "Thanks for calling Test Auto Shop!",
  upsellEnabled: true,
  upsellRules: null,
  confidenceThreshold: "0.80",
  maxUpsellsPerCall: 1,
  language: "en",
  elevenLabsAgentId: null, // NOT provisioned yet
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

function createContext(user: AuthenticatedUser | null = testUser): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Signup Flow Regression", () => {
  beforeEach(() => {
    resetDbMock();
    vi.clearAllMocks();
  });

  describe("Step 1: Create shop", () => {
    it("shop.create sets ownerId from authenticated user", async () => {
      const { createShop } = await import("./db");
      (createShop as any).mockResolvedValue(1);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.create({ name: "My New Shop" });

      expect(result.id).toBe(1);
      expect(createShop).toHaveBeenCalledWith(
        expect.objectContaining({ name: "My New Shop", ownerId: 1 })
      );
    });
  });

  describe("Step 2: Save agent config", () => {
    it("shop.saveAgentConfig saves config with ownership check", async () => {
      const { getShopById, upsertAgentConfig } = await import("./db");
      (getShopById as any).mockResolvedValue(mockShop);
      (upsertAgentConfig as any).mockResolvedValue(1);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.saveAgentConfig({
        shopId: 1,
        agentName: "Alex",
        greeting: "Thanks for calling!",
      });

      expect(result.id).toBe(1);
      expect(upsertAgentConfig).toHaveBeenCalled();
    });

    it("rejects saving config for another user's shop", async () => {
      const { getShopById } = await import("./db");
      (getShopById as any).mockResolvedValue({ ...mockShop, ownerId: 999 });

      const caller = appRouter.createCaller(createContext());
      await expect(
        caller.shop.saveAgentConfig({ shopId: 1, agentName: "Alex" })
      ).rejects.toThrow();
    });
  });

  describe("Step 3: Provision ElevenLabs agent (CRITICAL)", () => {
    it("provisionAgent creates a new agent when elevenLabsAgentId is null", async () => {
      const { getShopById, getAgentConfigByShop, upsertAgentConfig } =
        await import("./db");
      const { createConversationalAgent } = await import(
        "./services/elevenLabsService"
      );

      (getShopById as any).mockResolvedValue(mockShop);
      (getAgentConfigByShop as any).mockResolvedValue(mockAgentConfig); // no elevenLabsAgentId

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.provisionAgent({ shopId: 1 });

      expect(result.action).toBe("created");
      expect(result.agentId).toBe("agent_test_new_123");
      expect(createConversationalAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining("Test Auto Shop"),
        })
      );
      // Must save the agent ID back to the config
      expect(upsertAgentConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          elevenLabsAgentId: "agent_test_new_123",
        })
      );
    });

    it("provisionAgent updates existing agent when elevenLabsAgentId is set", async () => {
      const { getShopById, getAgentConfigByShop } = await import("./db");
      const { updateConversationalAgent } = await import(
        "./services/elevenLabsService"
      );

      (getShopById as any).mockResolvedValue(mockShop);
      (getAgentConfigByShop as any).mockResolvedValue({
        ...mockAgentConfig,
        elevenLabsAgentId: "agent_existing_456",
      });

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.provisionAgent({ shopId: 1 });

      expect(result.action).toBe("updated");
      expect(result.agentId).toBe("agent_existing_456");
      expect(updateConversationalAgent).toHaveBeenCalledWith(
        "agent_existing_456",
        expect.objectContaining({
          name: expect.stringContaining("Test Auto Shop"),
        })
      );
    });

    it("provisionAgent rejects if no agent config exists", async () => {
      const { getShopById, getAgentConfigByShop } = await import("./db");
      (getShopById as any).mockResolvedValue(mockShop);
      (getAgentConfigByShop as any).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createContext());
      await expect(caller.shop.provisionAgent({ shopId: 1 })).rejects.toThrow(
        /save your agent configuration first/i
      );
    });
  });

  describe("Step 4: Agent status check", () => {
    it("getAgentStatus shows NOT live when agent is unprovisioned", async () => {
      const { getShopById, getAgentConfigByShop } = await import("./db");
      (getShopById as any).mockResolvedValue(mockShop);
      (getAgentConfigByShop as any).mockResolvedValue(mockAgentConfig); // no elevenLabsAgentId

      const caller = appRouter.createCaller(createContext());
      const status = await caller.shop.getAgentStatus({ shopId: 1 });

      expect(status).toBeDefined();
      expect(status!.hasConfig).toBe(true);
      expect(status!.hasAgent).toBe(false);
      expect(status!.hasPhone).toBe(true);
      expect(status!.isLive).toBe(false); // NOT live — this is the bug we fixed
    });

    it("getAgentStatus shows LIVE when agent + phone are both provisioned", async () => {
      const { getShopById, getAgentConfigByShop } = await import("./db");
      (getShopById as any).mockResolvedValue(mockShop);
      (getAgentConfigByShop as any).mockResolvedValue({
        ...mockAgentConfig,
        elevenLabsAgentId: "agent_live_789",
      });

      const caller = appRouter.createCaller(createContext());
      const status = await caller.shop.getAgentStatus({ shopId: 1 });

      expect(status).toBeDefined();
      expect(status!.hasConfig).toBe(true);
      expect(status!.hasAgent).toBe(true);
      expect(status!.hasPhone).toBe(true);
      expect(status!.isLive).toBe(true);
    });

    it("getAgentStatus shows NOT live when phone is missing", async () => {
      const { getShopById, getAgentConfigByShop } = await import("./db");
      (getShopById as any).mockResolvedValue({
        ...mockShop,
        twilioPhoneNumber: null,
      });
      (getAgentConfigByShop as any).mockResolvedValue({
        ...mockAgentConfig,
        elevenLabsAgentId: "agent_no_phone",
      });

      const caller = appRouter.createCaller(createContext());
      const status = await caller.shop.getAgentStatus({ shopId: 1 });

      expect(status!.hasAgent).toBe(true);
      expect(status!.hasPhone).toBe(false);
      expect(status!.isLive).toBe(false);
    });
  });
});
