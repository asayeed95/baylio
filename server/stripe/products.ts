/**
 * Baylio Stripe Product Definitions
 *
 * Centralized product/price configuration for all subscription tiers.
 * These are created in Stripe on first use and cached by price ID.
 *
 * Tier structure:
 * - Starter: $199/mo, 300 minutes
 * - Pro: $349/mo, 750 minutes (most popular)
 * - Elite: $599/mo, 1500 minutes
 *
 * Additional charges:
 * - Setup fee: $500-$2,000 (one-time, per location)
 * - Overage: $0.15/minute beyond included
 * - Annual billing: 20% discount
 */

export interface BaylioTier {
  id: "trial" | "starter" | "pro" | "elite";
  name: string;
  description: string;
  monthlyPrice: number; // in cents
  annualPrice: number; // in cents (per month, billed annually)
  includedMinutes: number;
  overageRate: number; // dollars per minute
  features: string[];
}

// ⚠️ DO NOT REMOVE THE TRIAL TIER — it is a permanent pricing option
export const TIERS: Record<string, BaylioTier> = {
  trial: {
    id: "trial",
    name: "Baylio Trial",
    description: "Try Baylio risk-free for your first month",
    monthlyPrice: 14900, // $149
    annualPrice: 14900, // No annual discount for trial
    includedMinutes: 150,
    overageRate: 0.15,
    features: [
      "AI receptionist (150 min/mo)",
      "Call logging & transcription",
      "Basic analytics dashboard",
      "Email notifications",
      "Business hours configuration",
      "14-day money-back guarantee",
    ],
  },
  starter: {
    id: "starter",
    name: "Baylio Starter",
    description: "AI receptionist for single-location shops getting started",
    monthlyPrice: 19900, // $199
    annualPrice: 15920, // $159.20/mo (20% off)
    includedMinutes: 300,
    overageRate: 0.15,
    features: [
      "AI receptionist (300 min/mo)",
      "Call logging & transcription",
      "Basic analytics dashboard",
      "Email notifications",
      "Business hours configuration",
    ],
  },
  pro: {
    id: "pro",
    name: "Baylio Pro",
    description: "For busy shops that need more capacity and integrations",
    monthlyPrice: 34900, // $349
    annualPrice: 27920, // $279.20/mo (20% off)
    includedMinutes: 750,
    overageRate: 0.15,
    features: [
      "Everything in Starter",
      "750 minutes per month",
      "Calendar integration",
      "Advanced analytics & trends",
      "SMS notifications to owner",
      "Custom AI voice & persona",
    ],
  },
  elite: {
    id: "elite",
    name: "Baylio Elite",
    description: "For multi-location operators and high-volume shops",
    monthlyPrice: 59900, // $599
    annualPrice: 47920, // $479.20/mo (20% off)
    includedMinutes: 1500,
    overageRate: 0.15,
    features: [
      "Everything in Pro",
      "1,500 minutes per month",
      "Intelligent upsell engine",
      "CRM integration",
      "Multi-location management",
      "Priority support",
      "Weekly performance reports",
    ],
  },
};

/**
 * Setup fee tiers based on number of locations.
 * Multi-location operators get volume discounts.
 */
export const SETUP_FEES = {
  single: 50000, // $500 for 1 location
  multi_3: 125000, // $1,250 for up to 3 locations ($417 each)
  multi_5: 200000, // $2,000 for up to 5 locations ($400 each)
  enterprise: 0, // Custom pricing for 5+ locations
};

/** Additional location add-on: $99/mo, 300 min included (same pool as Starter) */
export const ADDITIONAL_SHOP_PRICE = 9900; // cents
export const ADDITIONAL_SHOP_MINUTES = 300;

export function getTierConfig(tierId: string): BaylioTier | undefined {
  return TIERS[tierId];
}

export function getOverageCharge(minutes: number, rate: number = 0.15): number {
  return Math.round(minutes * rate * 100) / 100; // dollars
}
