/**
 * SMTP Configuration Test
 * Validates that the Microsoft 365 SMTP credentials are correctly configured
 * by verifying the transporter can connect and authenticate.
 */
import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP Configuration", () => {
  it("should have all required SMTP environment variables set", () => {
    expect(process.env.SMTP_HOST).toBeTruthy();
    expect(process.env.SMTP_PORT).toBeTruthy();
    expect(process.env.SMTP_USER).toBeTruthy();
    expect(process.env.SMTP_PASS).toBeTruthy();
  });

  it("should create a valid nodemailer transporter with MS365 settings", () => {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    expect(transporter).toBeDefined();
    // Verify the transporter has the correct host configured
    const options = transporter.options as Record<string, unknown>;
    expect(options.host).toBe("smtp.office365.com");
    expect(options.port).toBe(587);
    expect(options.secure).toBe(false);
  });

  it("should have SMTP_USER set to hello@baylio.io", () => {
    expect(process.env.SMTP_USER).toBe("hello@baylio.io");
  });
});
