/**
 * Stripe tRPC Router
 * 
 * Provides checkout session creation and customer portal access
 * through the tRPC API. These procedures are called by the frontend
 * to initiate payments and manage billing.
 */

import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../_core/trpc";
import { getShopById, getSubscriptionByShop } from "../db";
import { TIERS, SETUP_FEES, getTierConfig } from "./products";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" as Stripe.LatestApiVersion });
}

export const stripeRouter = router({
  /**
   * Create a checkout session for a new subscription.
   * Returns the checkout URL for the frontend to redirect to.
   */
  createSubscriptionCheckout: protectedProcedure
    .input(
      z.object({
        shopId: z.number(),
        tier: z.enum(["starter", "pro", "elite"]),
        billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new Error("Shop not found or unauthorized");
      }

      const tierConfig = getTierConfig(input.tier);
      if (!tierConfig) throw new Error("Invalid tier");

      const stripe = getStripe();
      const priceInCents =
        input.billingCycle === "annual"
          ? tierConfig.annualPrice
          : tierConfig.monthlyPrice;

      const origin = ctx.req.headers.origin || "https://baylio.io";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: ctx.user.id.toString(),
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        metadata: {
          user_id: ctx.user.id.toString(),
          shop_id: input.shopId.toString(),
          tier: input.tier,
          billing_cycle: input.billingCycle,
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: tierConfig.name,
                description: tierConfig.description,
              },
              unit_amount: priceInCents,
              recurring: {
                interval: input.billingCycle === "annual" ? "year" : "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/shops/${input.shopId}?payment=success`,
        cancel_url: `${origin}/shops/${input.shopId}/subscriptions?payment=canceled`,
      });

      return { checkoutUrl: session.url };
    }),

  /**
   * Create a checkout session for a one-time setup fee.
   */
  createSetupFeeCheckout: protectedProcedure
    .input(
      z.object({
        shopId: z.number(),
        locationCount: z.enum(["single", "multi_3", "multi_5"]).default("single"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new Error("Shop not found or unauthorized");
      }

      const stripe = getStripe();
      const feeAmount = SETUP_FEES[input.locationCount];
      const origin = ctx.req.headers.origin || "https://baylio.io";

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: ctx.user.id.toString(),
        customer_email: ctx.user.email || undefined,
        allow_promotion_codes: true,
        metadata: {
          user_id: ctx.user.id.toString(),
          shop_id: input.shopId.toString(),
          type: "setup_fee",
          location_count: input.locationCount,
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Baylio Setup & Onboarding",
                description: `Professional onboarding for ${input.locationCount === "single" ? "1 location" : input.locationCount === "multi_3" ? "up to 3 locations" : "up to 5 locations"}`,
              },
              unit_amount: feeAmount,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/shops/${input.shopId}?setup=success`,
        cancel_url: `${origin}/shops/${input.shopId}/subscriptions?setup=canceled`,
      });

      return { checkoutUrl: session.url };
    }),

  /**
   * Create a customer portal session for self-service billing management.
   * Allows customers to update payment methods, view invoices, and cancel.
   */
  createPortalSession: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new Error("Shop not found or unauthorized");
      }

      const sub = await getSubscriptionByShop(input.shopId);
      if (!sub?.stripeCustomerId) {
        throw new Error("No active subscription found");
      }

      const stripe = getStripe();
      const origin = ctx.req.headers.origin || "https://baylio.io";

      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${origin}/shops/${input.shopId}/subscriptions`,
      });

      return { portalUrl: session.url };
    }),

  /**
   * Get available tiers and pricing for display.
   */
  getTiers: protectedProcedure.query(() => {
    return Object.values(TIERS);
  }),
});
