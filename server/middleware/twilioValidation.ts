/**
 * Twilio Webhook Signature Validation Middleware
 *
 * Validates the X-Twilio-Signature header against the incoming request
 * using HMAC-SHA1 with the TWILIO_AUTH_TOKEN. This prevents toll fraud
 * from spoofed webhooks.
 *
 * Security features:
 * - Timing-safe comparison (prevents timing attacks)
 * - Forensic logging of failed validation attempts
 * - Feature flag for gradual rollout (log-only → enforce)
 * - Fail-closed: missing auth token = 500 (not 200)
 */
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

interface TwilioValidationOptions {
  /** If true, invalid signatures are logged but not rejected (for testing) */
  logOnly?: boolean;
}

/**
 * Compute the expected Twilio signature for a request.
 *
 * Algorithm (from Twilio docs):
 * 1. Take the full URL of the request
 * 2. If POST, sort POST params alphabetically and append key+value
 * 3. Hash the result with HMAC-SHA1 using the auth token
 * 4. Base64 encode the hash
 */
function computeExpectedSignature(
  authToken: string,
  url: string,
  params: Record<string, string> = {}
): string {
  // Sort params alphabetically by key and append key+value to URL
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  return crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Returns true if strings are equal.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to maintain constant time
    const bufA = Buffer.from(a, "utf-8");
    const bufB = Buffer.from(a, "utf-8"); // intentionally same length
    crypto.timingSafeEqual(bufA, bufB);
    return false;
  }
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Log a forensic entry for webhook validation events.
 */
function logForensic(
  level: "warn" | "error" | "info",
  message: string,
  details: Record<string, unknown>
) {
  const entry = {
    timestamp: new Date().toISOString(),
    service: "twilio-validation",
    level,
    message,
    ...details,
  };
  if (level === "error" || level === "warn") {
    console.error(`[SECURITY] ${JSON.stringify(entry)}`);
  } else {
    console.log(`[SECURITY] ${JSON.stringify(entry)}`);
  }
}

/**
 * Express middleware that validates Twilio webhook signatures.
 *
 * Usage:
 *   app.use("/api/twilio", validateTwilioSignature());
 *   app.use("/api/twilio", validateTwilioSignature({ logOnly: true })); // testing mode
 */
export function validateTwilioSignature(options: TwilioValidationOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const validationEnabled = process.env.TWILIO_VALIDATION_ENABLED !== "false";

    // Fail-closed: if no auth token is configured, reject all requests
    if (!authToken) {
      logForensic(
        "error",
        "TWILIO_AUTH_TOKEN not configured — rejecting webhook",
        {
          ip: req.ip,
          path: req.path,
          method: req.method,
        }
      );
      return res.status(500).json({
        error: "Server configuration error: Twilio auth token not set",
      });
    }

    // If validation is disabled via env, pass through with a log
    if (!validationEnabled) {
      logForensic(
        "info",
        "Twilio validation disabled via TWILIO_VALIDATION_ENABLED=false",
        {
          path: req.path,
        }
      );
      return next();
    }

    const twilioSignature = req.headers["x-twilio-signature"] as
      | string
      | undefined;

    if (!twilioSignature) {
      logForensic(
        "warn",
        "Missing X-Twilio-Signature header — potential spoofing attempt",
        {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.headers["user-agent"],
          headers: Object.keys(req.headers),
        }
      );

      if (options.logOnly) {
        return next();
      }
      return res.status(403).json({
        error: "Forbidden: Missing Twilio signature",
      });
    }

    // Reconstruct the full URL as Twilio sees it
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers["host"];
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    // For POST requests, use the body params; for GET, use query params
    const params = req.method === "POST" ? req.body || {} : {};

    const expectedSignature = computeExpectedSignature(
      authToken,
      fullUrl,
      params
    );
    const isValid = timingSafeCompare(twilioSignature, expectedSignature);

    if (!isValid) {
      logForensic("error", "POTENTIAL WEBHOOK SPOOFING / TOLL FRAUD ATTEMPT", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.headers["user-agent"],
        receivedSignature: twilioSignature.substring(0, 8) + "...",
        fullUrl,
        bodyKeys: Object.keys(req.body || {}),
      });

      if (options.logOnly) {
        return next();
      }
      return res.status(403).json({
        error: "Forbidden: Invalid Twilio signature",
      });
    }

    // Valid signature — log and proceed
    logForensic("info", "Twilio webhook signature validated", {
      path: req.path,
      method: req.method,
    });

    next();
  };
}

export { computeExpectedSignature, timingSafeCompare };
