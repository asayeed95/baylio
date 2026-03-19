/**
 * Baylio Stripe Product Definitions
 * 
 * Centralized product/price configuration for all subscription tiers.
 * These are created in Stripe on first use and cached by price ID.
 * 
 * Tier structure:
 * - Pilot: $149/mo, 150 minutes, 1 location, 1 line, after-hours only, 30-day no-commitment trial
 * - Starter: $199/mo, 300 minutes
 * - Pro: $349/mo, 750 minutes (most popular)
 * - Elite: $599/mo, 1500 minutes
 * 
 * Additional charges:
 * - Setup fee: $500-$2,000 (one-time, per location) — waived for Pilot
 * - Overage: $0.15/minute beyond included
 * - Annual billing: 20% discount (not available for Pilot)
 */

export interface BaylioTier {
  id: "pilot" | "starter" | "pro" | "elite";
  name: string;
  description: string;
  monthlyPrice: number; // in cents
  annualPrice: number; // in cents (per month, billed annually) — 0 if not available
  includedMinutes: number;
  overageRate: number; // dollars per minute
  features: string[];
  /** Maximum number of locations for this tier */
  maxLocations: number;
  /** Maximum number of phone lines for this tier */
  maxLines: number;
  /** Whether this tier is after-hours only */
  afterHoursOnly: boolean;
  /** Trial period in days (0 = no trial) */
  trialDays: number;
  /** Whether setup fee is waived for this tier */
  setupFeeWaived: boolean;
  /** Whether annual billing is available */
  annualAvailable: boolean;
}

export const TIERS: Record<string, BaylioTier> = {
  pilot: {
    id: "pilot",
    name: "Baylio Pilot",
    description: "Low-friction entry point — try Baylio risk-free for 30 days",
    monthlyPrice: 14900, // $149
    annualPrice: 0, // Not available for Pilot
    includedMinutes: 150,
    overageRate: 0.15,
    features: [
      "AI receptionist (150 min/mo)",
      "1 location, 1 phone line",
      "After-hours coverage only",
      "Call logging & transcription",
      "SMS recaps to owner",
      "30-day no-commitment trial",
      "No setup fee",
    ],
    maxLocations: 1,
    maxLines: 1,
    afterHoursOnly: true,
    trialDays: 30,
    setupFeeWaived: true,
    annualAvailable: false,
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
    maxLocations: 1,
    maxLines: 1,
    afterHoursOnly: false,
    trialDays: 7,
    setupFeeWaived: false,
    annualAvailable: true,
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
    maxLocations: 3,
    maxLines: 3,
    afterHoursOnly: false,
    trialDays: 7,
    setupFeeWaived: false,
    annualAvailable: true,
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
    maxLocations: 5,
    maxLines: 5,
    afterHoursOnly: false,
    trialDays: 7,
    setupFeeWaived: false,
    annualAvailable: true,
  },
};

/**
 * Setup fee tiers based on number of locations.
 * Multi-location operators get volume discounts.
 * Pilot tier has setup fee waived.
 */
export const SETUP_FEES = {
  single: 50000, // $500 for 1 location
  multi_3: 125000, // $1,250 for up to 3 locations ($417 each)
  multi_5: 200000, // $2,000 for up to 5 locations ($400 each)
  enterprise: 0, // Custom pricing for 5+ locations
};

export function getTierConfig(tierId: string): BaylioTier | undefined {
  return TIERS[tierId];
}

export function getOverageCharge(minutes: number, rate: number = 0.15): number {
  return Math.round(minutes * rate * 100) / 100; // dollars
}

/**
 * Check if a tier supports after-hours-only mode.
 * Pilot tier is restricted to after-hours coverage.
 */
export function isAfterHoursOnly(tierId: string): boolean {
  return TIERS[tierId]?.afterHoursOnly ?? false;
}

/**
 * Get the setup fee for a tier (0 if waived).
 */
export function getSetupFee(tierId: string, locationCount: number = 1): number {
  const tier = TIERS[tierId];
  if (!tier || tier.setupFeeWaived) return 0;

  if (locationCount <= 1) return SETUP_FEES.single;
  if (locationCount <= 3) return SETUP_FEES.multi_3;
  if (locationCount <= 5) return SETUP_FEES.multi_5;
  return SETUP_FEES.enterprise;
}
