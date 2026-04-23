/**
 * webhookUrl resolver tests.
 *
 * Load-bearing: a misresolved webhook URL causes Twilio number purchase to
 * fail silently (LOOP: "phone_purchase_failed" step in completeOnboarding).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveWebhookBaseUrl, isValidWebhookBaseUrl } from "./webhookUrl";

describe("resolveWebhookBaseUrl", () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    delete process.env.WEBHOOK_BASE_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("prefers WEBHOOK_BASE_URL env var above all other sources", () => {
    process.env.WEBHOOK_BASE_URL = "https://baylio.io";
    process.env.VERCEL_URL = "preview-abc.vercel.app";
    const result = resolveWebhookBaseUrl({
      headers: { origin: "https://malicious.example", host: "x.com" },
    });
    expect(result).toBe("https://baylio.io");
  });

  it("strips trailing slash from WEBHOOK_BASE_URL", () => {
    process.env.WEBHOOK_BASE_URL = "https://baylio.io/";
    expect(resolveWebhookBaseUrl()).toBe("https://baylio.io");
  });

  it("uses VERCEL_URL with https prefix when WEBHOOK_BASE_URL is unset", () => {
    process.env.VERCEL_URL = "baylio-abc123.vercel.app";
    expect(resolveWebhookBaseUrl()).toBe("https://baylio-abc123.vercel.app");
  });

  it("falls back to request origin header", () => {
    const result = resolveWebhookBaseUrl({
      headers: { origin: "https://my-preview.vercel.app" },
    });
    expect(result).toBe("https://my-preview.vercel.app");
  });

  it("synthesizes from host header + protocol when no env or origin", () => {
    const result = resolveWebhookBaseUrl({
      headers: { host: "baylio.io" },
      protocol: "https",
    });
    expect(result).toBe("https://baylio.io");
  });

  it("uses http for localhost host", () => {
    const result = resolveWebhookBaseUrl({
      headers: { host: "localhost:3000" },
    });
    expect(result).toBe("http://localhost:3000");
  });

  it("falls back to hardcoded baylio.io when nothing is available", () => {
    expect(resolveWebhookBaseUrl()).toBe("https://baylio.io");
    expect(resolveWebhookBaseUrl(undefined)).toBe("https://baylio.io");
    expect(resolveWebhookBaseUrl({ headers: {} })).toBe("https://baylio.io");
  });

  it("rejects a non-http origin string and falls through to next source", () => {
    process.env.VERCEL_URL = "prod.vercel.app";
    const result = resolveWebhookBaseUrl({
      headers: { origin: "javascript:alert(1)" },
    });
    expect(result).toBe("https://prod.vercel.app");
  });
});

describe("isValidWebhookBaseUrl", () => {
  it("accepts https production URLs", () => {
    expect(isValidWebhookBaseUrl("https://baylio.io")).toBe(true);
    expect(isValidWebhookBaseUrl("https://my-preview.vercel.app")).toBe(true);
  });

  it("accepts http only for localhost", () => {
    expect(isValidWebhookBaseUrl("http://localhost:3000")).toBe(true);
    expect(isValidWebhookBaseUrl("http://127.0.0.1:3000")).toBe(true);
  });

  it("rejects http for non-localhost hosts", () => {
    expect(isValidWebhookBaseUrl("http://baylio.io")).toBe(false);
    expect(isValidWebhookBaseUrl("http://example.com")).toBe(false);
  });

  it("rejects non-absolute or malformed URLs", () => {
    expect(isValidWebhookBaseUrl("")).toBe(false);
    expect(isValidWebhookBaseUrl("/api/twilio")).toBe(false);
    expect(isValidWebhookBaseUrl("baylio.io")).toBe(false);
    expect(isValidWebhookBaseUrl("not a url")).toBe(false);
  });

  it("rejects non-http schemes", () => {
    expect(isValidWebhookBaseUrl("javascript:alert(1)")).toBe(false);
    expect(isValidWebhookBaseUrl("file:///etc/passwd")).toBe(false);
    expect(isValidWebhookBaseUrl("ftp://baylio.io")).toBe(false);
  });
});
