/**
 * Onboard Route — POST /api/onboard
 * 
 * Public endpoint called by the ElevenLabs custom tool (send_onboard_link)
 * when the AI sales agent collects prospect info on the phone.
 * 
 * This is NOT a tRPC route because it's called by ElevenLabs server-to-server,
 * not by the frontend. It uses a simple API key for authentication.
 * 
 * Request body:
 * {
 *   shopName: string,
 *   ownerName: string,
 *   email: string,
 *   phone: string,
 *   tier: "starter" | "pro" | "elite" | "trial"
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   checkoutUrl?: string
 * }
 */

import { Router, Request, Response } from "express";
import { createOnboardCheckout, type OnboardRequest } from "../services/onboardService";

const onboardRouter = Router();

/**
 * Validate the onboard request body.
 * Returns null if valid, or an error message string.
 */
function validateOnboardRequest(body: any): string | null {
  if (!body.shopName || typeof body.shopName !== "string" || body.shopName.trim().length < 2) {
    return "shopName is required (min 2 characters)";
  }
  if (!body.ownerName || typeof body.ownerName !== "string" || body.ownerName.trim().length < 2) {
    return "ownerName is required (min 2 characters)";
  }
  if (!body.email || typeof body.email !== "string" || !body.email.includes("@")) {
    return "A valid email is required";
  }
  if (!body.phone || typeof body.phone !== "string") {
    return "phone is required";
  }
  // Phone must have at least 10 digits
  const digits = body.phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return "phone must have at least 10 digits";
  }
  
  const validTiers = ["starter", "pro", "elite", "trial"];
  if (body.tier && !validTiers.includes(body.tier)) {
    return `tier must be one of: ${validTiers.join(", ")}`;
  }

  return null;
}

onboardRouter.post("/", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validationError = validateOnboardRequest(req.body);
    if (validationError) {
      console.warn(`[ONBOARD] Validation failed: ${validationError}`);
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const onboardReq: OnboardRequest = {
      shopName: req.body.shopName.trim(),
      ownerName: req.body.ownerName.trim(),
      email: req.body.email.trim().toLowerCase(),
      phone: req.body.phone.trim(),
      tier: req.body.tier || "starter",
    };

    console.log(`[ONBOARD] Processing: ${onboardReq.shopName} (${onboardReq.ownerName}) → ${onboardReq.tier}`);

    const result = await createOnboardCheckout(onboardReq);

    const elapsed = Date.now() - startTime;
    console.log(`[ONBOARD] Complete in ${elapsed}ms: success=${result.success}, sms=${result.smsSent}`);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.error || "Failed to create checkout session",
      });
    }

    return res.json({
      success: true,
      message: result.smsSent
        ? `Payment link sent to ${onboardReq.phone} via SMS`
        : `Payment link created but SMS delivery failed. URL: ${result.checkoutUrl}`,
      checkoutUrl: result.checkoutUrl,
      smsSent: result.smsSent,
    });
  } catch (err: any) {
    console.error("[ONBOARD] Unhandled error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during onboarding",
    });
  }
});

export { onboardRouter };
