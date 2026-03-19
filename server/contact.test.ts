import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Contact Router Tests
 *
 * Tests the public contact form submission procedure.
 * Database calls are mocked to test router logic in isolation.
 */

vi.mock("./db", () => ({
  createContactSubmission: vi.fn().mockResolvedValue(42),
  // Stubs required by other routers imported via appRouter
  getShopsByOwner: vi.fn().mockResolvedValue([]),
  getShopById: vi.fn().mockResolvedValue(null),
  createShop: vi.fn().mockResolvedValue(1),
  updateShop: vi.fn(),
  deleteShop: vi.fn(),
  getAgentConfigByShop: vi.fn().mockResolvedValue(null),
  upsertAgentConfig: vi.fn().mockResolvedValue(1),
  getSubscriptionByShop: vi.fn().mockResolvedValue(null),
  createSubscription: vi.fn().mockResolvedValue(1),
  updateSubscription: vi.fn(),
  getUsageBySubscription: vi.fn().mockResolvedValue([]),
  getCallLogsByShop: vi.fn().mockResolvedValue([]),
  getCallLogCountByShop: vi.fn().mockResolvedValue(0),
  getShopAnalytics: vi.fn().mockResolvedValue(null),
  getMissedCallAudits: vi.fn().mockResolvedValue([]),
  createMissedCallAudit: vi.fn().mockResolvedValue(1),
  updateMissedCallAudit: vi.fn(),
  getNotificationsByUser: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  getOrganizationsByOwner: vi.fn().mockResolvedValue([]),
  createOrganization: vi.fn().mockResolvedValue(1),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

function createContext(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("contact", () => {
  it("contact.submit accepts a valid submission", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.contact.submit({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "(555) 123-4567",
      message: "I'd like to learn more about Baylio for my shop.",
    });
    expect(result).toEqual({ success: true, id: 42 });
  });

  it("contact.submit works without a phone number", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.contact.submit({
      name: "John Smith",
      email: "john@example.com",
      message: "Quick question about pricing.",
    });
    expect(result).toEqual({ success: true, id: 42 });
  });

  it("contact.submit works without authentication", async () => {
    const caller = appRouter.createCaller(createContext(null));
    const result = await caller.contact.submit({
      name: "Anonymous",
      email: "anon@example.com",
      message: "Hello!",
    });
    expect(result.success).toBe(true);
  });

  it("contact.submit rejects invalid email", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.contact.submit({
        name: "Test",
        email: "not-an-email",
        message: "Hello",
      })
    ).rejects.toThrow();
  });

  it("contact.submit rejects empty name", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.contact.submit({
        name: "",
        email: "test@example.com",
        message: "Hello",
      })
    ).rejects.toThrow();
  });

  it("contact.submit rejects empty message", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(
      caller.contact.submit({
        name: "Test",
        email: "test@example.com",
        message: "",
      })
    ).rejects.toThrow();
  });

  it("contact.submit calls createContactSubmission with correct data", async () => {
    const { createContactSubmission } = await import("./db");
    const caller = appRouter.createCaller(createContext());
    await caller.contact.submit({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "(555) 123-4567",
      message: "Interested in Baylio.",
    });
    expect(createContactSubmission).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "(555) 123-4567",
      message: "Interested in Baylio.",
    });
  });
});
