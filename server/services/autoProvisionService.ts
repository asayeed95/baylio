/**
 * Auto-Provision Service — Zero-Touch Account Setup
 * 
 * Triggered by Stripe webhook (checkout.session.completed) when a prospect
 * completes payment via the SMS checkout link sent by the AI sales agent.
 * 
 * Full provisioning pipeline:
 * 1. Create user account (or find existing by email)
 * 2. Create shop record with prospect's info
 * 3. Create default agent config for the shop
 * 4. Create subscription record linked to Stripe
 * 5. Purchase and assign a Twilio phone number
 * 6. Send welcome SMS with login info and next steps
 * 7. Notify Abdur (owner) of new customer
 * 
 * All data comes from Stripe session metadata — no database lookups needed.
 * This is the engine that makes the autonomous sales pipeline work.
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users, shops, agentConfigs, subscriptions } from "../../drizzle/schema";
import { purchasePhoneNumber, searchAvailableNumbers } from "./twilioProvisioning";
import { notifyOwner } from "../_core/notification";
import twilio from "twilio";

// ─── Types ──────────────────────────────────────────────────────────

export interface ProvisionRequest {
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;           // E.164
  tier: "starter" | "pro" | "elite";
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripeSessionId: string;
  isTrial: boolean;
}

export interface ProvisionResult {
  success: boolean;
  userId?: number;
  shopId?: number;
  twilioNumber?: string;
  error?: string;
}

// ─── Tier → Minutes Mapping ─────────────────────────────────────────

const TIER_MINUTES: Record<string, number> = {
  starter: 300,
  pro: 750,
  elite: 1500,
};

// ─── Helpers ────────────────────────────────────────────────────────

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return drizzle(process.env.DATABASE_URL);
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Twilio credentials not configured");
  return twilio(sid, token);
}

// ─── Main Provisioning Pipeline ─────────────────────────────────────

export async function autoProvisionAccount(req: ProvisionRequest): Promise<ProvisionResult> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  console.log(`[AUTO-PROVISION] Starting for ${req.shopName} (${req.ownerName}, ${req.email})`);

  try {
    // ── Step 1: Create or find user ──────────────────────────────
    let userId: number;

    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, req.email))
      .limit(1);

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      console.log(`[AUTO-PROVISION] Found existing user: ${userId}`);
    } else {
      // Create a new user with a generated openId
      // The openId is a unique identifier — for auto-provisioned users we use email-based
      const openId = `onboard_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const result = await db.insert(users).values({
        openId,
        name: req.ownerName,
        email: req.email,
        role: "user",
        loginMethod: "stripe_onboard",
      });
      userId = result[0].insertId;
      console.log(`[AUTO-PROVISION] Created new user: ${userId} (${req.email})`);
    }

    // ── Step 2: Create shop ──────────────────────────────────────
    const shopResult = await db.insert(shops).values({
      ownerId: userId,
      name: req.shopName,
      phone: req.phone,
      isActive: true,
      timezone: "America/New_York", // Default, can be changed later
    });
    const shopId = shopResult[0].insertId;
    console.log(`[AUTO-PROVISION] Created shop: ${shopId} (${req.shopName})`);

    // ── Step 3: Create default agent config ──────────────────────
    await db.insert(agentConfigs).values({
      shopId,
      ownerId: userId,
      agentName: "Baylio",
      greeting: `Thanks for calling ${req.shopName}! This is Baylio, your AI assistant. How can I help you today?`,
      upsellEnabled: true,
      confidenceThreshold: "0.80",
      maxUpsellsPerCall: 1,
      language: "en",
      isActive: true,
    });
    console.log(`[AUTO-PROVISION] Created agent config for shop ${shopId}`);

    // ── Step 4: Create subscription record ───────────────────────
    const includedMinutes = TIER_MINUTES[req.tier] || 300;
    await db.insert(subscriptions).values({
      shopId,
      ownerId: userId,
      tier: req.tier,
      status: req.isTrial ? "trialing" : "active",
      stripeCustomerId: req.stripeCustomerId,
      stripeSubscriptionId: req.stripeSubscriptionId,
      includedMinutes,
      usedMinutes: 0,
      billingCycle: "monthly",
    });
    console.log(`[AUTO-PROVISION] Created subscription: ${req.tier} (${req.isTrial ? "trial" : "paid"})`);

    // ── Step 5: Purchase and assign Twilio number ────────────────
    let twilioNumber: string | undefined;
    try {
      twilioNumber = await provisionTwilioNumber(shopId, req.shopName);
      if (twilioNumber) {
        console.log(`[AUTO-PROVISION] Assigned Twilio number: ${twilioNumber}`);
      }
    } catch (twilioErr) {
      console.error(`[AUTO-PROVISION] Twilio provisioning failed (non-fatal):`, twilioErr);
      // Don't fail the whole pipeline — number can be assigned manually later
    }

    // ── Step 6: Send welcome SMS ─────────────────────────────────
    try {
      await sendWelcomeSMS(req.phone, req.ownerName, req.shopName, twilioNumber);
    } catch (smsErr) {
      console.error(`[AUTO-PROVISION] Welcome SMS failed (non-fatal):`, smsErr);
    }

    // ── Step 7: Notify Abdur ─────────────────────────────────────
    try {
      await notifyOwner({
        title: `🎉 New Customer: ${req.shopName}`,
        content: `${req.ownerName} just signed up for Baylio ${req.tier}${req.isTrial ? " (trial)" : ""}!\n\nShop: ${req.shopName}\nEmail: ${req.email}\nPhone: ${req.phone}\nTwilio #: ${twilioNumber || "pending"}\nSource: AI Sales Call\nStripe Session: ${req.stripeSessionId}`,
      });
    } catch (notifyErr) {
      console.error(`[AUTO-PROVISION] Owner notification failed (non-fatal):`, notifyErr);
    }

    console.log(`[AUTO-PROVISION] ✅ Complete! user=${userId}, shop=${shopId}, number=${twilioNumber || "pending"}`);

    return {
      success: true,
      userId,
      shopId,
      twilioNumber,
    };
  } catch (err: any) {
    console.error(`[AUTO-PROVISION] ❌ Failed:`, err);
    return {
      success: false,
      error: err.message,
    };
  }
}

// ─── Twilio Number Provisioning ─────────────────────────────────────

/**
 * Search for and purchase a local US phone number for the new shop.
 * Tries common area codes, falls back to any available number.
 */
async function provisionTwilioNumber(shopId: number, shopName: string): Promise<string | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  // Determine the webhook base URL
  const baseUrl = process.env.VITE_APP_URL || "https://baylio-ai-lrtlctkw.manus.space";

  // Try to find an available number — start with common US area codes
  const areaCodes = ["415", "212", "310", "312", "404", "713", "214", "602"];
  
  for (const areaCode of areaCodes) {
    try {
      const available = await searchAvailableNumbers(areaCode);
      if (available.length > 0) {
        const number = available[0];
        const provisioned = await purchasePhoneNumber(
          number.phoneNumber,
          shopId,
          baseUrl,
          `Baylio — ${shopName}`
        );

        // Update shop with the assigned number
        await db
          .update(shops)
          .set({
            twilioPhoneNumber: provisioned.phoneNumber,
            twilioPhoneSid: provisioned.sid,
          })
          .where(eq(shops.id, shopId));

        return provisioned.phoneNumber;
      }
    } catch (err) {
      // Try next area code
      continue;
    }
  }

  console.warn(`[AUTO-PROVISION] Could not find available Twilio number for shop ${shopId}`);
  return undefined;
}

// ─── Welcome SMS Sequence ───────────────────────────────────────────

/**
 * Send a welcome SMS to the new customer with their account info.
 * This is the first touchpoint after payment — make it count.
 */
async function sendWelcomeSMS(
  phone: string,
  ownerName: string,
  shopName: string,
  twilioNumber?: string
): Promise<void> {
  const client = getTwilioClient();
  const fromNumber = process.env.BAYLIO_SALES_PHONE || "+18448752441";
  const appUrl = process.env.VITE_APP_URL || "https://baylio-ai-lrtlctkw.manus.space";

  // Message 1: Welcome + Login
  const welcomeMsg = `🎉 Welcome to Baylio, ${ownerName}!\n\nYour AI receptionist for ${shopName} is being set up right now.\n\nLog in to your dashboard:\n${appUrl}\n\nUse your email (${phone}) to sign in.`;

  await client.messages.create({
    to: phone,
    from: fromNumber,
    body: welcomeMsg,
  });

  // Message 2: Next steps (sent 5 seconds later via setTimeout equivalent)
  const numberInfo = twilioNumber
    ? `Your dedicated AI phone number: ${twilioNumber}\n\nTo go live, set up call forwarding from your shop's main line to ${twilioNumber}. Most phone providers let you do this in settings or by dialing *72${twilioNumber.replace("+1", "")}.`
    : `We're assigning you a dedicated phone number — you'll get a text with it shortly.`;

  const setupMsg = `📋 Next steps for ${shopName}:\n\n${numberInfo}\n\nNeed help? Reply to this text or call (844) 875-2441.\n\n— The Baylio Team`;

  // Small delay so messages arrive in order
  await new Promise((resolve) => setTimeout(resolve, 2000));

  await client.messages.create({
    to: phone,
    from: fromNumber,
    body: setupMsg,
  });

  console.log(`[AUTO-PROVISION] Welcome SMS sequence sent to ${phone}`);
}
