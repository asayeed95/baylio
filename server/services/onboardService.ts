/**
 * Onboard Service — Autonomous Sales Pipeline
 * 
 * Called when the AI sales agent collects prospect info on the phone.
 * 
 * Flow:
 * 1. Create Stripe Checkout Session (subscription mode for paid, or setup mode for trial)
 * 2. Send SMS to prospect's phone with the checkout link
 * 3. When prospect completes checkout → Stripe webhook fires → auto-provision everything
 * 
 * This is the bridge between the AI phone call and the self-serve signup.
 * Zero human touch required.
 */

import Stripe from "stripe";
import twilio from "twilio";

// ─── Types ──────────────────────────────────────────────────────────

export interface OnboardRequest {
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;         // E.164 or raw digits — we normalize
  tier: "starter" | "pro" | "elite" | "trial";
  callerPhone?: string;  // The phone they called from (may differ from SMS target)
}

export interface OnboardResult {
  success: boolean;
  checkoutUrl: string;
  smsSent: boolean;
  error?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" as any });
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  return twilio(sid, token);
}

/**
 * Normalize a phone number to E.164 format.
 * Handles: "5551234567", "(555) 123-4567", "+15551234567", "15551234567"
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.startsWith("+")) return phone;
  return `+${digits}`;
}

// ─── Tier → Stripe Price Mapping ────────────────────────────────────

const TIER_PRICES: Record<string, { amount: number; name: string; minutes: number }> = {
  starter: { amount: 19900, name: "Baylio Starter", minutes: 300 },
  pro:     { amount: 34900, name: "Baylio Pro", minutes: 750 },
  elite:   { amount: 59900, name: "Baylio Elite", minutes: 1500 },
};

// ─── Main Function ──────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session and send the link via SMS.
 * 
 * For paid tiers: Creates a subscription checkout with the tier price.
 * For trial: Creates a subscription checkout with a 7-day free trial.
 * 
 * Metadata on the session carries all prospect info so the webhook
 * can auto-provision without any database lookups.
 */
export async function createOnboardCheckout(req: OnboardRequest): Promise<OnboardResult> {
  const stripe = getStripe();
  const normalizedPhone = normalizePhone(req.phone);
  
  // Determine tier config (trial defaults to starter)
  const effectiveTier = req.tier === "trial" ? "starter" : req.tier;
  const tierConfig = TIER_PRICES[effectiveTier];
  if (!tierConfig) {
    return { success: false, checkoutUrl: "", smsSent: false, error: `Invalid tier: ${req.tier}` };
  }

  try {
    // Step 1: Find or create Stripe customer
    const existingCustomers = await stripe.customers.list({
      email: req.email,
      limit: 1,
    });

    let customerId: string;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: req.email,
        name: req.ownerName,
        phone: normalizedPhone,
        metadata: {
          shop_name: req.shopName,
          source: "ai_sales_call",
        },
      });
      customerId = customer.id;
    }

    // Step 2: Create or find the Stripe Price for this tier
    // Use product search to find existing, or create on the fly
    const priceId = await getOrCreatePrice(stripe, effectiveTier, tierConfig);

    // Step 3: Build the checkout session
    // The success_url and cancel_url point to the Baylio site
    const baseUrl = process.env.VITE_APP_URL || "https://baylio-ai-lrtlctkw.manus.space";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        // These are critical — the webhook uses them to auto-provision
        onboard_shop_name: req.shopName,
        onboard_owner_name: req.ownerName,
        onboard_email: req.email,
        onboard_phone: normalizedPhone,
        onboard_tier: effectiveTier,
        onboard_source: "ai_sales_call",
      },
      subscription_data: {
        metadata: {
          shop_name: req.shopName,
          tier: effectiveTier,
        },
        ...(req.tier === "trial" ? { trial_period_days: 7 } : {}),
      },
      customer_update: {
        address: "auto",
      },
      allow_promotion_codes: true,
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    console.log(`[ONBOARD] Checkout session created: ${session.id} for ${req.shopName} (${effectiveTier})`);

    // Step 4: Send SMS with checkout link
    let smsSent = false;
    try {
      smsSent = await sendCheckoutSMS(normalizedPhone, session.url!, req.ownerName, req.tier);
    } catch (smsErr) {
      console.error("[ONBOARD] SMS send failed:", smsErr);
      // Don't fail the whole operation if SMS fails — the URL still works
    }

    return {
      success: true,
      checkoutUrl: session.url!,
      smsSent,
    };
  } catch (err: any) {
    console.error("[ONBOARD] Error creating checkout:", err);
    return {
      success: false,
      checkoutUrl: "",
      smsSent: false,
      error: err.message,
    };
  }
}

// ─── Stripe Price Management ────────────────────────────────────────

/**
 * Get or create a Stripe Price for a given tier.
 * Caches product/price IDs to avoid creating duplicates.
 */
const priceCache: Record<string, string> = {};

async function getOrCreatePrice(
  stripe: Stripe,
  tierId: string,
  config: { amount: number; name: string; minutes: number }
): Promise<string> {
  if (priceCache[tierId]) return priceCache[tierId];

  // Search for existing product by metadata
  const products = await stripe.products.list({ limit: 100 });
  let product = products.data.find(
    (p) => p.metadata?.baylio_tier === tierId && p.active
  );

  if (!product) {
    product = await stripe.products.create({
      name: config.name,
      description: `${config.name} — ${config.minutes} AI minutes/month for auto repair shops`,
      metadata: { baylio_tier: tierId },
    });
    console.log(`[ONBOARD] Created Stripe product: ${product.id} (${tierId})`);
  }

  // Find existing monthly price
  const prices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 10,
  });

  let price = prices.data.find(
    (p) => p.unit_amount === config.amount && p.recurring?.interval === "month"
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: config.amount,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { baylio_tier: tierId },
    });
    console.log(`[ONBOARD] Created Stripe price: ${price.id} ($${config.amount / 100}/mo)`);
  }

  priceCache[tierId] = price.id;
  return price.id;
}

// ─── SMS Delivery ───────────────────────────────────────────────────

/**
 * Send the Stripe Checkout link via Twilio SMS.
 * Uses the Baylio sales line number as the sender.
 */
async function sendCheckoutSMS(
  to: string,
  checkoutUrl: string,
  ownerName: string,
  tier: string
): Promise<boolean> {
  const client = getTwilioClient();
  const fromNumber = process.env.BAYLIO_SALES_PHONE || "+18448752441";

  const tierLabel = tier === "trial" ? "free 7-day trial" : `${tier.charAt(0).toUpperCase() + tier.slice(1)} plan`;

  const body = `Hey ${ownerName}! 👋 Here's your Baylio ${tierLabel} signup link:\n\n${checkoutUrl}\n\nTap the link to complete your signup. Once done, we'll automatically set up your AI phone agent and text you your login info.\n\n— Baylio AI`;

  const message = await client.messages.create({
    to,
    from: fromNumber,
    body,
  });

  console.log(`[ONBOARD] SMS sent to ${to}: ${message.sid} (status: ${message.status})`);
  return true;
}
