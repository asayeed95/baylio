/**
 * Stripe Routes
 * 
 * Handles:
 * 1. Checkout session creation for new subscriptions and setup fees
 * 2. Webhook processing for payment events
 * 3. Customer portal session creation for self-service billing
 * 
 * The webhook endpoint MUST be registered BEFORE express.json() middleware
 * because Stripe signature verification requires the raw request body.
 */

import express from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { subscriptions, shops, users } from "../../drizzle/schema";
import { TIERS, SETUP_FEES, getTierConfig } from "./products";

const router = express.Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" as any });
}

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return drizzle(process.env.DATABASE_URL);
}

// ─── Webhook Handler ────────────────────────────────────────────────
// This route uses express.raw() for Stripe signature verification.
// It is registered separately in index.ts BEFORE express.json().
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Handle test events for webhook verification
    if (event.id.startsWith("evt_test_")) {
      console.log("[Stripe Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        }
        case "invoice.paid": {
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        }
        case "invoice.payment_failed": {
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        }
        case "customer.subscription.updated": {
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        }
        case "customer.subscription.deleted": {
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        }
        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
      // Return 200 to prevent Stripe from retrying — log the error for investigation
      return res.status(200).json({ received: true, error: "Processing error" });
    }

    return res.json({ received: true });
  }
);

// ─── Webhook Event Handlers ─────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) return;

  const userId = session.metadata?.user_id;
  const shopId = session.metadata?.shop_id;
  const tier = session.metadata?.tier;
  const isSetupFee = session.metadata?.type === "setup_fee";

  if (isSetupFee && shopId) {
    // Mark setup fee as paid
    await db
      .update(subscriptions)
      .set({ setupFeePaid: true })
      .where(eq(subscriptions.shopId, parseInt(shopId)));
    console.log(`[Stripe] Setup fee paid for shop ${shopId}`);
    return;
  }

  if (!userId || !shopId || !tier) {
    console.warn("[Stripe] Missing metadata in checkout session:", session.id);
    return;
  }

  const tierConfig = getTierConfig(tier);
  if (!tierConfig) return;

  // Create or update subscription record
  const existingSubs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.shopId, parseInt(shopId)))
    .limit(1);

  if (existingSubs.length > 0) {
    await db
      .update(subscriptions)
      .set({
        tier: tierConfig.id,
        status: "active",
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
        includedMinutes: tierConfig.includedMinutes,
      })
      .where(eq(subscriptions.shopId, parseInt(shopId)));
  } else {
    await db.insert(subscriptions).values({
      shopId: parseInt(shopId),
      ownerId: parseInt(userId),
      tier: tierConfig.id,
      status: "active",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      includedMinutes: tierConfig.includedMinutes,
      usedMinutes: 0,
    });
  }

  console.log(`[Stripe] Subscription created: shop=${shopId}, tier=${tier}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const db = await getDb();
  if (!db) return;

  // Stripe v2025 API changes: subscription is now nested under parent
  const invoiceAny = invoice as any;
  const subscriptionId = (invoiceAny.subscription ?? invoiceAny.parent?.subscription_details?.subscription) as string;
  if (!subscriptionId) return;

  // Reset usage minutes at the start of each billing period
  const subs = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
    .limit(1);

  if (subs.length > 0) {
    const periodStart = invoiceAny.period_start ?? invoiceAny.period?.start;
    const periodEnd = invoiceAny.period_end ?? invoiceAny.period?.end;
    await db
      .update(subscriptions)
      .set({
        status: "active",
        usedMinutes: 0,
        currentPeriodStart: periodStart
          ? new Date(periodStart * 1000)
          : undefined,
        currentPeriodEnd: periodEnd
          ? new Date(periodEnd * 1000)
          : undefined,
      })
      .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
  }

  console.log(`[Stripe] Invoice paid for subscription: ${subscriptionId}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const db = await getDb();
  if (!db) return;

  const invoiceAny2 = invoice as any;
  const subscriptionId = (invoiceAny2.subscription ?? invoiceAny2.parent?.subscription_details?.subscription) as string;
  if (!subscriptionId) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due" })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  console.log(`[Stripe] Payment failed for subscription: ${subscriptionId}`);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  const statusMap: Record<string, "active" | "past_due" | "canceled" | "trialing"> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    trialing: "trialing",
  };

  const status = statusMap[sub.status] || "active";

  await db
    .update(subscriptions)
    .set({
      status,
      currentPeriodStart: new Date(((sub as any).current_period_start ?? 0) * 1000),
      currentPeriodEnd: new Date(((sub as any).current_period_end ?? 0) * 1000),
    })
    .where(eq(subscriptions.stripeSubscriptionId, sub.id));

  console.log(`[Stripe] Subscription updated: ${sub.id} → ${status}`);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(subscriptions)
    .set({ status: "canceled" })
    .where(eq(subscriptions.stripeSubscriptionId, sub.id));

  console.log(`[Stripe] Subscription canceled: ${sub.id}`);
}

export { router as stripeWebhookRouter };
