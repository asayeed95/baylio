/**
 * Database Access Layer
 *
 * Provides typed query helpers for all Baylio domain entities.
 * All functions use Drizzle ORM for type-safe parameterized queries.
 * Each function lazily initializes the DB connection on first use.
 */
import { and, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

import {
  agentConfigs,
  callLogs,
  contactSubmissions,
  missedCallAudits,
  notifications,
  organizations,
  shops,
  subscriptions,
  usageRecords,
  users,
} from "../drizzle/schema";
import type {
  InsertAgentConfig,
  InsertCallLog,
  InsertContactSubmission,
  InsertMissedCallAudit,
  InsertNotification,
  InsertOrganization,
  InsertShop,
  InsertSubscription,
  InsertUsageRecord,
  InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

/** Get or lazily create the database connection singleton. */
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/** Upsert a user by openId. Creates on first sign-in, updates on subsequent. */
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

/** Look up a user by their OAuth openId. Returns undefined if not found. */
export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Organizations ────────────────────────────────────────────────────

/** Create a new organization and return its ID. */
export async function createOrganization(data: InsertOrganization) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(organizations).values(data);
  return result[0].insertId;
}

/** List all organizations owned by a user. */
export async function getOrganizationsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).where(eq(organizations.ownerId, ownerId));
}

// ─── Shops ────────────────────────────────────────────────────────────

/** Create a new shop and return its ID. */
export async function createShop(data: InsertShop) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(shops).values(data);
  return result[0].insertId;
}

/** List all shops owned by a user, newest first. */
export async function getShopsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shops).where(eq(shops.ownerId, ownerId)).orderBy(desc(shops.createdAt));
}

/** Get a shop by its primary key. Returns undefined if not found. */
export async function getShopById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shops).where(eq(shops.id, id)).limit(1);
  return result[0];
}

/** Update a shop's fields by ID. */
export async function updateShop(id: number, data: Partial<InsertShop>) {
  const db = await getDb();
  if (!db) return;
  await db.update(shops).set(data).where(eq(shops.id, id));
}

/** Delete a shop by ID. */
export async function deleteShop(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shops).where(eq(shops.id, id));
}

// ─── Agent Configs ────────────────────────────────────────────────────

/** Get the AI agent configuration for a shop. */
export async function getAgentConfigByShop(shopId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(agentConfigs).where(eq(agentConfigs.shopId, shopId)).limit(1);
  return result[0];
}

/** Insert or update the agent config for a shop. */
export async function upsertAgentConfig(data: InsertAgentConfig) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getAgentConfigByShop(data.shopId);
  if (existing) {
    await db.update(agentConfigs).set(data).where(eq(agentConfigs.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(agentConfigs).values(data);
  return result[0].insertId;
}

// ─── Call Logs ────────────────────────────────────────────────────────

/** Create a call log entry and return its ID. */
export async function createCallLog(data: InsertCallLog) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(callLogs).values(data);
  return result[0].insertId;
}

/** Fetch call logs for a shop with pagination and optional filters. */
export async function getCallLogsByShop(
  shopId: number,
  opts?: { limit?: number; offset?: number; startDate?: Date; endDate?: Date; status?: string }
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(callLogs.shopId, shopId)];
  if (opts?.startDate) conditions.push(gte(callLogs.callStartedAt, opts.startDate));
  if (opts?.endDate) conditions.push(lte(callLogs.callStartedAt, opts.endDate));
  if (opts?.status) conditions.push(eq(callLogs.status, opts.status as typeof callLogs.status.enumValues[number]));
  return db.select().from(callLogs)
    .where(and(...conditions))
    .orderBy(desc(callLogs.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

/** Get total call count for a shop (used for pagination). */
export async function getCallLogCountByShop(shopId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(callLogs).where(eq(callLogs.shopId, shopId));
  return result[0]?.count ?? 0;
}

// ─── Analytics ────────────────────────────────────────────────────────

/** Aggregate analytics (calls, revenue, appointments) for a shop with optional date range. */
export async function getShopAnalytics(shopId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [eq(callLogs.shopId, shopId)];
  if (startDate) conditions.push(gte(callLogs.callStartedAt, startDate));
  if (endDate) conditions.push(lte(callLogs.callStartedAt, endDate));
  const result = await db.select({
    totalCalls: count(),
    totalRevenue: sql<string>`COALESCE(SUM(${callLogs.estimatedRevenue}), 0)`,
    appointmentsBooked: sql<number>`SUM(CASE WHEN ${callLogs.appointmentBooked} = true THEN 1 ELSE 0 END)`,
    missedCalls: sql<number>`SUM(CASE WHEN ${callLogs.status} = 'missed' THEN 1 ELSE 0 END)`,
    avgDuration: sql<string>`COALESCE(AVG(${callLogs.duration}), 0)`,
    avgSentiment: sql<string>`COALESCE(AVG(${callLogs.sentimentScore}), 0)`,
    upsellAttempts: sql<number>`SUM(CASE WHEN ${callLogs.upsellAttempted} = true THEN 1 ELSE 0 END)`,
    upsellAccepted: sql<number>`SUM(CASE WHEN ${callLogs.upsellAccepted} = true THEN 1 ELSE 0 END)`,
  }).from(callLogs).where(and(...conditions));
  return result[0];
}

// ─── Missed Call Audits ───────────────────────────────────────────────

/** Create a missed call audit record. */
export async function createMissedCallAudit(data: InsertMissedCallAudit) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(missedCallAudits).values(data);
  return result[0].insertId;
}

/** List missed call audits, optionally filtered by shop. */
export async function getMissedCallAudits(shopId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (shopId) {
    return db.select().from(missedCallAudits).where(eq(missedCallAudits.shopId, shopId)).orderBy(desc(missedCallAudits.createdAt));
  }
  return db.select().from(missedCallAudits).orderBy(desc(missedCallAudits.createdAt));
}

/** Update a missed call audit's fields. */
export async function updateMissedCallAudit(id: number, data: Partial<InsertMissedCallAudit>) {
  const db = await getDb();
  if (!db) return;
  await db.update(missedCallAudits).set(data).where(eq(missedCallAudits.id, id));
}

// ─── Subscriptions ────────────────────────────────────────────────────

/** Get the active subscription for a shop. */
export async function getSubscriptionByShop(shopId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.shopId, shopId)).limit(1);
  return result[0];
}

/** Create a new subscription and return its ID. */
export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(subscriptions).values(data);
  return result[0].insertId;
}

/** Update a subscription's fields. */
export async function updateSubscription(id: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

// ─── Usage Records ────────────────────────────────────────────────────

/** Record a usage entry for billing. */
export async function createUsageRecord(data: InsertUsageRecord) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(usageRecords).values(data);
  return result[0].insertId;
}

/** Get usage records for a subscription, newest first. */
export async function getUsageBySubscription(subscriptionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(usageRecords).where(eq(usageRecords.subscriptionId, subscriptionId)).orderBy(desc(usageRecords.recordedAt));
}

// ─── Notifications ────────────────────────────────────────────────────

/** Create a new notification for a user. */
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(notifications).values(data);
  return result[0].insertId;
}

/** Fetch notifications for a user, with optional unread-only filter. */
export async function getNotificationsByUser(userId: number, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));
  return db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt)).limit(50);
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
}

/** Mark all notifications for a user as read. */
export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ─── Contact Submissions ─────────────────────────────────────────────

/** Save a public contact form submission. */
export async function createContactSubmission(data: InsertContactSubmission) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save contact submission: database not available");
    return undefined;
  }
  const result = await db.insert(contactSubmissions).values(data);
  return result[0].insertId;
}

// ─── Affiliates ──────────────────────────────────────────────────────

import {
  affiliates,
  affiliateReferrals,
  affiliateCommissions,
  affiliatePayouts,
} from "../drizzle/schema";
import type {
  InsertAffiliate,
  InsertAffiliateReferral,
  InsertAffiliateCommission,
  InsertAffiliatePayout,
} from "../drizzle/schema";

/** Create a new affiliate and return its ID. */
export async function createAffiliate(data: InsertAffiliate) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(affiliates).values(data);
  return result[0].insertId;
}

/** Get an affiliate by user ID. */
export async function getAffiliateByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(affiliates).where(eq(affiliates.userId, userId)).limit(1);
  return result[0];
}

/** Get an affiliate by their unique referral code. */
export async function getAffiliateByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(affiliates).where(eq(affiliates.code, code)).limit(1);
  return result[0];
}

/** Get an affiliate by ID. */
export async function getAffiliateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(affiliates).where(eq(affiliates.id, id)).limit(1);
  return result[0];
}

/** Update an affiliate's fields. */
export async function updateAffiliate(id: number, data: Partial<InsertAffiliate>) {
  const db = await getDb();
  if (!db) return;
  await db.update(affiliates).set(data).where(eq(affiliates.id, id));
}

/** List all affiliates (admin view), newest first. */
export async function listAffiliates() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(affiliates).orderBy(desc(affiliates.createdAt));
}

/** Increment click count for an affiliate. */
export async function incrementAffiliateClicks(affiliateId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(affiliates)
    .set({ totalClicks: sql`${affiliates.totalClicks} + 1` })
    .where(eq(affiliates.id, affiliateId));
}

// ─── Affiliate Referrals ─────────────────────────────────────────────

/** Create a referral record. */
export async function createAffiliateReferral(data: InsertAffiliateReferral) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(affiliateReferrals).values(data);
  return result[0].insertId;
}

/** Get referrals for an affiliate. */
export async function getReferralsByAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(affiliateReferrals)
    .where(eq(affiliateReferrals.affiliateId, affiliateId))
    .orderBy(desc(affiliateReferrals.createdAt));
}

/** Update a referral's status. */
export async function updateAffiliateReferral(id: number, data: Partial<InsertAffiliateReferral>) {
  const db = await getDb();
  if (!db) return;
  await db.update(affiliateReferrals).set(data).where(eq(affiliateReferrals.id, id));
}

/** Find a referral by shop ID (to link commission on subscription). */
export async function getReferralByShop(shopId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(affiliateReferrals)
    .where(eq(affiliateReferrals.shopId, shopId)).limit(1);
  return result[0];
}

// ─── Affiliate Commissions ───────────────────────────────────────────

/** Create a commission record. */
export async function createAffiliateCommission(data: InsertAffiliateCommission) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(affiliateCommissions).values(data);
  return result[0].insertId;
}

/** Get commissions for an affiliate. */
export async function getCommissionsByAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(affiliateCommissions)
    .where(eq(affiliateCommissions.affiliateId, affiliateId))
    .orderBy(desc(affiliateCommissions.createdAt));
}

/** Get total pending commissions for an affiliate. */
export async function getPendingCommissionTotal(affiliateId: number) {
  const db = await getDb();
  if (!db) return "0.00";
  const result = await db.select({
    total: sql<string>`COALESCE(SUM(${affiliateCommissions.amount}), 0)`,
  }).from(affiliateCommissions)
    .where(and(
      eq(affiliateCommissions.affiliateId, affiliateId),
      eq(affiliateCommissions.status, "pending"),
    ));
  return result[0]?.total ?? "0.00";
}

// ─── Affiliate Network (Downline) ───────────────────────────────────

/** Get affiliates recruited by a given affiliate (their downline). */
export async function getAffiliatesByParent(parentUserId: number) {
  const db = await getDb();
  if (!db) return [];
  // Find the parent affiliate record first
  const parent = await getAffiliateByUserId(parentUserId);
  if (!parent) return [];
  // parentAffiliateId doesn't exist in schema — use a convention:
  // We don't have parentAffiliateId in schema, so downline is not supported yet.
  // Return empty for now until schema is extended.
  return [];
}

// ─── Affiliate Payouts ──────────────────────────────────────────────

/** Create a payout request. */
export async function createAffiliatePayout(data: InsertAffiliatePayout) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(affiliatePayouts).values(data);
  return result[0].insertId;
}

/** Get payouts for an affiliate. */
export async function getPayoutsByAffiliate(affiliateId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(affiliatePayouts)
    .where(eq(affiliatePayouts.affiliateId, affiliateId))
    .orderBy(desc(affiliatePayouts.createdAt));
}

/** Check if affiliate has a pending payout. */
export async function hasPendingPayout(affiliateId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: affiliatePayouts.id }).from(affiliatePayouts)
    .where(and(
      eq(affiliatePayouts.affiliateId, affiliateId),
      eq(affiliatePayouts.status, "pending"),
    ))
    .limit(1);
  return result.length > 0;
}
