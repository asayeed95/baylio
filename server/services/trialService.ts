/**
 * Trial Service
 *
 * Single source of truth for "does this shop get live Baylio service?"
 *
 * Access rules (evaluated in order):
 *   1. Active paid subscription (status: active | trialing | past_due) → YES
 *   2. Active trial window (trialEndsAt > now) → YES
 *   3. Otherwise → NO (trial expired + no subscription)
 *
 * Trial expiry is intentionally evaluated against the raw `trialEndsAt`
 * timestamp, not a per-shop-timezone end-of-day. The cron-driven reminder
 * emails (day 7/12/13/14) + the trial-started-now-plus-14-days convention
 * give shops a consistent 14-day window; trying to extend that with
 * timezone math adds complexity for near-zero user benefit.
 */

import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { shops, subscriptions } from "../../drizzle/schema";

export type AccessStatus = {
  hasAccess: boolean;
  reason: "subscription" | "trial" | "trial_expired" | "no_trial" | "shop_not_found";
  trialEndsAt: Date | null;
  trialDaysRemaining: number | null;
  subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" | null;
};

export async function getShopAccessStatus(shopId: number): Promise<AccessStatus> {
  const db = await getDb();
  if (!db) {
    return {
      hasAccess: false,
      reason: "shop_not_found",
      trialEndsAt: null,
      trialDaysRemaining: null,
      subscriptionStatus: null,
    };
  }

  const shopRow = await db
    .select({ trialEndsAt: shops.trialEndsAt })
    .from(shops)
    .where(eq(shops.id, shopId))
    .limit(1);

  if (!shopRow[0]) {
    return {
      hasAccess: false,
      reason: "shop_not_found",
      trialEndsAt: null,
      trialDaysRemaining: null,
      subscriptionStatus: null,
    };
  }

  const trialEndsAt = shopRow[0].trialEndsAt;

  // Check for an active (or grace-period) subscription first
  const subRow = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.shopId, shopId),
        inArray(subscriptions.status, ["active", "trialing", "past_due"])
      )
    )
    .limit(1);

  const subscriptionStatus = subRow[0]?.status ?? null;

  if (subscriptionStatus) {
    return {
      hasAccess: true,
      reason: "subscription",
      trialEndsAt,
      trialDaysRemaining: computeDaysRemaining(trialEndsAt),
      subscriptionStatus,
    };
  }

  // No active subscription — fall back to trial window
  if (!trialEndsAt) {
    return {
      hasAccess: false,
      reason: "no_trial",
      trialEndsAt: null,
      trialDaysRemaining: null,
      subscriptionStatus: null,
    };
  }

  const now = new Date();
  if (trialEndsAt.getTime() > now.getTime()) {
    return {
      hasAccess: true,
      reason: "trial",
      trialEndsAt,
      trialDaysRemaining: computeDaysRemaining(trialEndsAt),
      subscriptionStatus: null,
    };
  }

  return {
    hasAccess: false,
    reason: "trial_expired",
    trialEndsAt,
    trialDaysRemaining: 0,
    subscriptionStatus: null,
  };
}

function computeDaysRemaining(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
