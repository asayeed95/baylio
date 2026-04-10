import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Shop Router Onboarding Flow Tests
 *
 * Tests the complete onboarding path: create shop → save agent config →
 * provision ElevenLabs agent → phone number assignment.
 */

const now = new Date();

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
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

vi.mock("./services/elevenLabsService", () => ({
  createConversationalAgent: vi.fn().mockResolvedValue({
    agent_id: "agent_onboard_test",
    name: "Test Agent",
    conversation_config: {},
  }),
  updateConversationalAgent: vi.fn().mockResolvedValue({
    agent_id: "agent_onboard_test",
    name: "Test Agent",
    conversation_config: {},
  }),
  withRetry: vi.fn(),
  listVoices: vi.fn().mockResolvedValue([]),
  deleteConversationalAgent: vi.fn(),
  getAgent: vi.fn(),
  getSubscriptionInfo: vi.fn(),
  getConversationHistory: vi.fn().mockResolvedValue([]),
  previewVoiceTTS: vi.fn().mockResolvedValue(Buffer.from("mp3data")),
  VOICE_CATALOG: [],
}));

vi.mock("./services/twilioProvisioning", () => ({
  validateTwilioCredentials: vi.fn().mockResolvedValue({ accountSid: "AC_test" }),
  searchAvailableNumbers: vi.fn().mockResolvedValue([
    { phoneNumber: "+18005551234", friendlyName: "(800) 555-1234" },
  ]),
  purchasePhoneNumber: vi.fn().mockResolvedValue({
    phoneNumber: "+18005551234",
    sid: "PN_test_123",
  }),
  releasePhoneNumber: vi.fn(),
  getAccountBalance: vi.fn().mockResolvedValue({ balance: "50.00", currency: "USD" }),
}));

vi.mock("./services/emailService", () => ({
  sendContactNotification: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const testUser: AuthenticatedUser = {
  id: 1,
  supabaseId: "onboarding-test",
  email: "owner@testshop.com",
  name: "New Owner",
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
  smsFollowUpEnabled: true,
  twilioPhoneNumber: null,
  twilioPhoneSid: null,
  organizationId: null,
  createdAt: now,
  updatedAt: now,
};

const mockAgentConfig = {
  id: 1,
  shopId: 1,
  ownerId: 1,
  voiceId: "voice_123",
  voiceName: "Charlie",
  agentName: "Alex",
  systemPrompt: "You are Alex.",
  greeting: "Hi!",
  upsellEnabled: true,
  upsellRules: null,
  confidenceThreshold: "0.80",
  maxUpsellsPerCall: 1,
  language: "en",
  elevenLabsAgentId: null,
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

describe("shopRouter — onboarding flow", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("1. Shop creation", () => {
    it("creates a shop with all fields", async () => {
      const { createShop } = await import("./db");

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.create({
        name: "My Auto Shop",
        phone: "(555) 999-0000",
        address: "456 Oak Ave",
        city: "Dallas",
        state: "TX",
        zip: "75201",
        timezone: "America/Chicago",
      });

      expect(result.id).toBe(1);
      expect(createShop).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Auto Shop",
          ownerId: 1,
          city: "Dallas",
        })
      );
    });

    it("rejects empty shop name", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.shop.create({ name: "" })).rejects.toThrow();
    });

    it("rejects unauthenticated users", async () => {
      const caller = appRouter.createCaller(createContext(null));
      await expect(caller.shop.create({ name: "Test" })).rejects.toThrow();
    });
  });

  describe("2. Agent config", () => {
    it("saves agent config with ownership check", async () => {
      const { getShopById, upsertAgentConfig } = await import("./db");
      (getShopById as any).mockResolvedValue(mockShop);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.saveAgentConfig({
        shopId: 1,
        agentName: "Alex",
        greeting: "Thanks for calling!",
        language: "en",
      });

      expect(result.id).toBe(1);
      expect(upsertAgentConfig).toHaveBeenCalled();
    });

    it("rejects config for another user's shop", async () => {
      const { getShopById } = await import("./db");
      (getShopById as any).mockResolvedValue({ ...mockShop, ownerId: 999 });

      const caller = appRouter.createCaller(createContext());
      await expect(
        caller.shop.saveAgentConfig({ shopId: 1, agentName: "Alex" })
      ).rejects.toThrow();
    });
  });

  describe("3. ElevenLabs agent provisioning", () => {
    it("creates new agent when not provisioned", async () => {
      const { getShopById, getAgentConfigByShop, upsertAgentConfig } = await import("./db");
      const { createConversationalAgent } = await import("./services/elevenLabsService");
      (getShopById as any).mockResolvedValue(mockShop);
      (getAgentConfigByShop as any).mockResolvedValue(mockAgentConfig);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.provisionAgent({ shopId: 1 });

      expect(result.action).toBe("created");
      expect(result.agentId).toBe("agent_onboard_test");
      expect(createConversationalAgent).toHaveBeenCalled();
      expect(upsertAgentConfig).toHaveBeenCalledWith(
        expect.objectContaining({ elevenLabsAgentId: "agent_onboard_test" })
      );
    });

    it("updates existing agent", async () => {
      const { getShopById, getAgentConfigByShop } = await import("./db");
      const { updateConversationalAgent } = await import("./services/elevenLabsService");
      (getShopById as any).mockResolvedValue(mockShop);
      (getAgentConfigByShop as any).mockResolvedValue({
        ...mockAgentConfig,
        elevenLabsAgentId: "agent_existing",
      });

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.provisionAgent({ shopId: 1 });

      expect(result.action).toBe("updated");
      expect(updateConversationalAgent).toHaveBeenCalledWith("agent_existing", expect.any(Object));
    });

    it("rejects without saved config", async () => {
      const { getShopById, getAgentConfigByShop } = await import("./db");
      (getShopById as any).mockResolvedValue(mockShop);
      (getAgentConfigByShop as any).mockResolvedValue(undefined);

      const caller = appRouter.createCaller(createContext());
      await expect(caller.shop.provisionAgent({ shopId: 1 })).rejects.toThrow(/configuration first/i);
    });
  });

  describe("4. Phone number assignment", () => {
    it("searches available numbers by area code", async () => {
      const { searchAvailableNumbers } = await import("./services/twilioProvisioning");

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.searchPhoneNumbers({ areaCode: "800" });

      expect(searchAvailableNumbers).toHaveBeenCalledWith("800");
      expect(result).toHaveLength(1);
    });

    it("purchases and assigns a phone number", async () => {
      const { getShopById, updateShop } = await import("./db");
      const { purchasePhoneNumber } = await import("./services/twilioProvisioning");
      (getShopById as any).mockResolvedValue(mockShop);

      const caller = appRouter.createCaller(createContext());
      const result = await caller.shop.purchasePhoneNumber({
        shopId: 1,
        phoneNumber: "+18005551234",
        webhookBaseUrl: "https://baylio.io",
      });

      expect(result.phoneNumber).toBe("+18005551234");
      expect(purchasePhoneNumber).toHaveBeenCalled();
      expect(updateShop).toHaveBeenCalledWith(1, expect.objectContaining({
        twilioPhoneNumber: "+18005551234",
      }));
    });
  });

  describe("5. Validation", () => {
    it("rejects shop name over 255 chars", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.shop.create({ name: "x".repeat(256) })).rejects.toThrow();
    });

    it("rejects invalid area code length", async () => {
      const caller = appRouter.createCaller(createContext());
      await expect(caller.shop.searchPhoneNumbers({ areaCode: "12" })).rejects.toThrow();
    });
  });
});

describe("saveAgentConfig — personality fields", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts characterPreset, warmth, salesIntensity, technicalDepth", async () => {
    const { getShopById, upsertAgentConfig } = await import("./db");
    const mockGetShopById = vi.mocked(getShopById);
    mockGetShopById.mockResolvedValue({ id: 1, ownerId: 42 } as any);
    const mockUpsert = vi.mocked(upsertAgentConfig);
    mockUpsert.mockResolvedValue(1);

    const caller = appRouter.createCaller({ user: { id: 42 } } as any);
    const result = await caller.shop.saveAgentConfig({
      shopId: 1,
      agentName: "Jordan",
      characterPreset: "sales_pro",
      warmth: 5,
      salesIntensity: 5,
      technicalDepth: 3,
    });
    expect(result).toEqual({ id: 1 });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ characterPreset: "sales_pro", warmth: 5, salesIntensity: 5, technicalDepth: 3 })
    );
  });
});

describe("previewVoice", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a base64 data URL for a valid voice ID", async () => {
    const caller = appRouter.createCaller({ user: { id: 42 } } as any);
    const result = await caller.shop.previewVoice({ voiceId: "21m00Tcm4TlvDq8ikWAM" });
    expect(result.audio).toMatch(/^data:audio\/mpeg;base64,/);
  });
});
