import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Contact Router Tests
 *
 * Verifies contact form submission saves to DB and triggers notifications.
 */

// Mock DB
vi.mock("./db", () => ({
  createContactSubmission: vi.fn().mockResolvedValue(1),
  getDb: vi.fn().mockResolvedValue(null),
  getShopsByOwner: vi.fn().mockResolvedValue([]),
  getShopById: vi.fn(),
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
  createContactSubmission: vi.fn().mockResolvedValue(1),
}));

// Mock email service
vi.mock("./services/emailService", () => ({
  sendContactNotification: vi.fn().mockResolvedValue(undefined),
}));

// Mock notification service
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock other services to prevent import errors
vi.mock("./services/elevenLabsService", () => ({
  createConversationalAgent: vi.fn(),
  updateConversationalAgent: vi.fn(),
  listVoices: vi.fn().mockResolvedValue([]),
  deleteConversationalAgent: vi.fn(),
  getAgent: vi.fn(),
  getSubscriptionInfo: vi.fn(),
  getConversationHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock("./services/twilioProvisioning", () => ({
  validateTwilioCredentials: vi.fn(),
  searchAvailableNumbers: vi.fn().mockResolvedValue([]),
  purchasePhoneNumber: vi.fn(),
  releasePhoneNumber: vi.fn(),
  getAccountBalance: vi.fn(),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("contactRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves submission to DB and returns success", async () => {
    const { createContactSubmission } = await import("./db");

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.contact.submit({
      name: "John Doe",
      email: "john@example.com",
      phone: "(555) 123-4567",
      message: "I'd like to learn more about Baylio for my shop.",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe(1);
    expect(createContactSubmission).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      phone: "(555) 123-4567",
      message: "I'd like to learn more about Baylio for my shop.",
    });
  });

  it("sends email notification with correct data", async () => {
    const { sendContactNotification } = await import("./services/emailService");

    const caller = appRouter.createCaller(createPublicContext());
    await caller.contact.submit({
      name: "Jane Smith",
      email: "jane@example.com",
      message: "How does Baylio handle after-hours calls?",
    });

    // Give the fire-and-forget promise time to settle
    await new Promise(r => setTimeout(r, 10));

    expect(sendContactNotification).toHaveBeenCalledWith({
      name: "Jane Smith",
      email: "jane@example.com",
      phone: null,
      message: "How does Baylio handle after-hours calls?",
    });
  });

  it("sends in-app notification to owner", async () => {
    const { notifyOwner } = await import("./_core/notification");

    const caller = appRouter.createCaller(createPublicContext());
    await caller.contact.submit({
      name: "Bob Builder",
      email: "bob@example.com",
      phone: "",
      message: "Interested in the Pro plan.",
    });

    await new Promise(r => setTimeout(r, 10));

    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "New contact from Bob Builder",
      })
    );
  });

  it("rejects invalid email addresses", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "Test",
        email: "not-an-email",
        message: "Hello",
      })
    ).rejects.toThrow();
  });

  it("rejects empty name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "",
        email: "test@example.com",
        message: "Hello",
      })
    ).rejects.toThrow();
  });
});
