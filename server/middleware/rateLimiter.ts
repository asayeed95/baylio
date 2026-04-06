/**
 * Simple in-memory rate limiter for public endpoints.
 * Uses a sliding window counter per IP address.
 *
 * Limitations: per-instance only (Vercel serverless = ephemeral).
 * For persistent rate limiting, use Upstash Redis later.
 */
import { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

export function rateLimit(opts: {
  /** Unique name for this limiter */
  name: string;
  /** Window size in seconds */
  windowSec: number;
  /** Max requests per window */
  max: number;
}) {
  if (!stores.has(opts.name)) {
    stores.set(opts.name, new Map());
  }
  const store = stores.get(opts.name)!;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 });
      return next();
    }

    entry.count++;
    if (entry.count > opts.max) {
      res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    return next();
  };
}
