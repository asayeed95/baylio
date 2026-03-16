import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  getSubscriptionByShop,
  createSubscription,
  updateSubscription,
  getUsageBySubscription,
  getShopById,
  getShopsByOwner,
} from "./db";

/**
 * Subscription & Billing Router
 * 
 * Manages the three-tier subscription model:
 * - Starter: $199/mo, 300 minutes included
 * - Pro:     $349/mo, 750 minutes included, calendar integration
 * - Elite:   $599/mo, 1500 minutes included, CRM + upsell engine
 * 
 * Handles:
 * - Subscription CRUD
 * - Usage tracking and overage calculation
 * - Tier upgrades/downgrades
 * - Billing cycle management (monthly/annual)
 * 
 * Stripe integration will be added via webdev_add_feature("stripe")
 * and will hook into these endpoints for payment processing.
 */

const TIER_CONFIG = {
  starter: { includedMinutes: 300, monthlyPrice: 199, setupFee: 500 },
  pro: { includedMinutes: 750, monthlyPrice: 349, setupFee: 1000 },
  elite: { includedMinutes: 1500, monthlyPrice: 599, setupFee: 2000 },
} as const;

export const subscriptionRouter = router({
  /**
   * Get subscription for a specific shop.
   */
  getByShop: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return null;
      const sub = await getSubscriptionByShop(input.shopId);
      if (!sub) return null;
      // Calculate overage
      const overageMinutes = Math.max(0, sub.usedMinutes - sub.includedMinutes);
      const overageCharge = overageMinutes * parseFloat(sub.overageRate ?? "0.15");
      return {
        ...sub,
        overageMinutes,
        overageCharge: overageCharge.toFixed(2),
        tierConfig: TIER_CONFIG[sub.tier],
        usagePercent: sub.includedMinutes > 0
          ? Math.min(100, Math.round((sub.usedMinutes / sub.includedMinutes) * 100))
          : 0,
      };
    }),

  /**
   * Get all subscriptions for the current user's shops.
   * Useful for the dashboard overview.
   */
  listAll: protectedProcedure
    .query(async ({ ctx }) => {
      const userShops = await getShopsByOwner(ctx.user.id);
      const results = await Promise.all(
        userShops.map(async (shop) => {
          const sub = await getSubscriptionByShop(shop.id);
          return { shop, subscription: sub ?? null };
        })
      );
      return results;
    }),

  /**
   * Create a new subscription for a shop.
   * Called during onboarding after shop creation.
   */
  create: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      tier: z.enum(["starter", "pro", "elite"]).default("starter"),
      billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
    }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new Error("Shop not found or unauthorized");
      }
      // Check if subscription already exists
      const existing = await getSubscriptionByShop(input.shopId);
      if (existing) {
        throw new Error("Subscription already exists for this shop. Use upgrade instead.");
      }
      const config = TIER_CONFIG[input.tier];
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (input.billingCycle === "annual" ? 12 : 1));

      const id = await createSubscription({
        shopId: input.shopId,
        tier: input.tier,
        status: "active",
        includedMinutes: config.includedMinutes,
        usedMinutes: 0,
        overageRate: "0.1500",
        billingCycle: input.billingCycle,
        setupFeeAmount: config.setupFee.toFixed(2),
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });
      return { id, tierConfig: config };
    }),

  /**
   * Upgrade or downgrade a subscription tier.
   */
  changeTier: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      newTier: z.enum(["starter", "pro", "elite"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new Error("Shop not found or unauthorized");
      }
      const sub = await getSubscriptionByShop(input.shopId);
      if (!sub) {
        throw new Error("No active subscription found");
      }
      const config = TIER_CONFIG[input.newTier];
      await updateSubscription(sub.id, {
        tier: input.newTier,
        includedMinutes: config.includedMinutes,
      });
      return { success: true, newTier: input.newTier, tierConfig: config };
    }),

  /**
   * Get usage records for a subscription.
   */
  getUsage: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return [];
      const sub = await getSubscriptionByShop(input.shopId);
      if (!sub) return [];
      return getUsageBySubscription(sub.id);
    }),

  /**
   * Get tier configuration (public info for pricing page).
   */
  getTierConfig: protectedProcedure
    .query(() => {
      return TIER_CONFIG;
    }),
});
