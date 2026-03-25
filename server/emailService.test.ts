import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Email Service Tests
 * Verifies Resend-based email sending for contact notifications.
 */

// Mock the resend module
const mockSend = vi.fn().mockResolvedValue({ data: { id: "email_123" } });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe("emailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sendContactNotification calls Resend with correct params", async () => {
    // Set API key so the client initializes
    process.env.RESEND_API_KEY = "re_test_123";

    // Re-import to pick up the env var
    vi.resetModules();
    const mockSend2 = vi.fn().mockResolvedValue({ data: { id: "email_456" } });
    vi.doMock("resend", () => ({
      Resend: vi.fn().mockImplementation(() => ({
        emails: { send: mockSend2 },
      })),
    }));
    const { sendContactNotification } = await import("./services/emailService");

    await sendContactNotification({
      name: "John Doe",
      email: "john@example.com",
      phone: "(555) 123-4567",
      message: "I want to try Baylio for my shop.",
    });

    expect(mockSend2).toHaveBeenCalledWith(
      expect.objectContaining({
        from: expect.stringContaining("baylio.io"),
        to: ["hello@baylio.io"],
        replyTo: "john@example.com",
        subject: expect.stringContaining("John Doe"),
      })
    );

    delete process.env.RESEND_API_KEY;
  });

  it("does not throw when Resend API fails", async () => {
    process.env.RESEND_API_KEY = "re_test_123";

    vi.resetModules();
    vi.doMock("resend", () => ({
      Resend: vi.fn().mockImplementation(() => ({
        emails: { send: vi.fn().mockRejectedValue(new Error("API down")) },
      })),
    }));
    const { sendContactNotification } = await import("./services/emailService");

    // Should not throw
    await expect(
      sendContactNotification({
        name: "Test",
        email: "test@test.com",
        message: "Hello",
      })
    ).resolves.toBeUndefined();

    delete process.env.RESEND_API_KEY;
  });

  it("escapes HTML in email body", async () => {
    process.env.RESEND_API_KEY = "re_test_123";

    vi.resetModules();
    const mockSend3 = vi.fn().mockResolvedValue({ data: { id: "email_789" } });
    vi.doMock("resend", () => ({
      Resend: vi.fn().mockImplementation(() => ({
        emails: { send: mockSend3 },
      })),
    }));
    const { sendContactNotification } = await import("./services/emailService");

    await sendContactNotification({
      name: '<script>alert("xss")</script>',
      email: "xss@test.com",
      message: "Test <b>bold</b>",
    });

    const callArgs = mockSend3.mock.calls[0][0];
    expect(callArgs.html).not.toContain("<script>");
    expect(callArgs.html).toContain("&lt;script&gt;");

    delete process.env.RESEND_API_KEY;
  });
});
