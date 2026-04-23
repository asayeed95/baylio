/**
 * Resolve the absolute public base URL for Twilio webhook configuration.
 *
 * Twilio rejects purchases/updates with a relative or malformed `voiceUrl`.
 * This helper enforces the "always absolute, always https" invariant by
 * falling through a priority chain of sources.
 *
 * Priority order (most-trusted first):
 *   1. `WEBHOOK_BASE_URL` — explicit prod config (e.g. "https://baylio.io")
 *   2. `VERCEL_URL` — auto-set by Vercel on every deployment (no protocol)
 *   3. `req.headers.origin` — browser-set on cross-origin fetches
 *   4. `req.headers.host` + protocol — last-resort synthesis from the current request
 *   5. Hardcoded `https://baylio.io` production default
 *
 * The returned URL never has a trailing slash.
 */

import type { IncomingMessage } from "http";

type MinimalReq = Pick<IncomingMessage, "headers"> & { protocol?: string };

export function resolveWebhookBaseUrl(req?: MinimalReq): string {
  // 1. Explicit env var — always wins
  const envUrl = process.env.WEBHOOK_BASE_URL?.trim();
  if (envUrl) return normalize(envUrl);

  // 2. Vercel deployment URL (preview + prod)
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return normalize(`https://${vercelUrl}`);

  // 3. Browser-sent Origin header
  const origin = req?.headers?.origin;
  if (origin && typeof origin === "string" && origin.startsWith("http")) {
    return normalize(origin);
  }

  // 4. Synthesize from Host header + protocol
  const host = req?.headers?.host;
  if (host && typeof host === "string") {
    const proto = req?.protocol || inferProtocolFromHost(host);
    return normalize(`${proto}://${host}`);
  }

  // 5. Hard-coded production fallback — last resort
  return "https://baylio.io";
}

/**
 * Validate that a URL is absolute and uses https (or http for localhost).
 * Twilio rejects relative URLs and non-http(s) schemes.
 */
export function isValidWebhookBaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    // http only allowed for local testing
    if (u.protocol === "http:" && !/^(localhost|127\.0\.0\.1)/i.test(u.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function normalize(url: string): string {
  return url.replace(/\/+$/, "");
}

function inferProtocolFromHost(host: string): string {
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(host)) return "http";
  return "https";
}
