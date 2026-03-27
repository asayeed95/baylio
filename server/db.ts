import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  shops,
  InsertShop,
  organizations,
  InsertOrganization,
  agentConfigs,
  InsertAgentConfig,
  callLogs,
  InsertCallLog,
  missedCallAudits,
  InsertMissedCallAudit,
  subscriptions,
  InsertSubscription,
  usageRecords,
  InsertUsageRecord,
  notifications,
  InsertNotification,
  contactSubmissions,
  InsertContactSubmission,
} from "../drizzle/schema";


let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { prepare: false });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.supabaseId) {
    throw new Error("User supabaseId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      supabaseId: user.supabaseId,
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
    } else if (process.env.OWNER_SUPABASE_ID && user.supabaseId === process.env.OWNER_SUPABASE_ID) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.supabaseId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserBySupabaseId(supabaseId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.supabaseId, supabaseId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Organizations ────────────────────────────────────────────────────
export async function createOrganization(data: InsertOrganization) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(organizations).values(data).returning({ id: organizations.id });
  return result[0].id;
}

export async function getOrganizationsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, ownerId));
}

// ─── Shops ────────────────────────────────────────────────────────────
export async function createShop(data: InsertShop) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(shops).values(data).returning({ id: shops.id });
  return result[0].id;
}

export async function getShopsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(shops)
    .where(eq(shops.ownerId, ownerId))
    .orderBy(desc(shops.createdAt));
}

export async function getShopById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shops).where(eq(shops.id, id)).limit(1);
  return result[0];
}

export async function updateShop(id: number, data: Partial<InsertShop>) {
  const db = await getDb();
  if (!db) return;
  await db.update(shops).set(data).where(eq(shops.id, id));
}

export async function deleteShop(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shops).where(eq(shops.id, id));
}

// ─── Agent Configs ────────────────────────────────────────────────────
export async function getAgentConfigByShop(shopId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(agentConfigs)
    .where(eq(agentConfigs.shopId, shopId))
    .limit(1);
  return result[0];
}

export async function upsertAgentConfig(data: InsertAgentConfig) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getAgentConfigByShop(data.shopId);
  if (existing) {
    await db
      .update(agentConfigs)
      .set(data)
      .where(eq(agentConfigs.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(agentConfigs).values(data).returning({ id: agentConfigs.id });
  return result[0].id;
}

// ─── Call Logs ────────────────────────────────────────────────────────
export async function createCallLog(data: InsertCallLog) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(callLogs).values(data).returning({ id: callLogs.id });
  return result[0].id;
}

export async function getCallLogsByShop(
  shopId: number,
  opts?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
  }
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(callLogs.shopId, shopId)];
  if (opts?.startDate)
    conditions.push(gte(callLogs.callStartedAt, opts.startDate));
  if (opts?.endDate) conditions.push(lte(callLogs.callStartedAt, opts.endDate));
  if (opts?.status) conditions.push(eq(callLogs.status, opts.status as any));
  return db
    .select()
    .from(callLogs)
    .where(and(...conditions))
    .orderBy(desc(callLogs.createdAt))
    .limit(opts?.limit ?? 50)
    .offset(opts?.offset ?? 0);
}

export async function getCallLogCountByShop(shopId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ count: count() })
    .from(callLogs)
    .where(eq(callLogs.shopId, shopId));
  return result[0]?.count ?? 0;
}

// ─── Analytics ────────────────────────────────────────────────────────
export async function getShopAnalytics(
  shopId: number,
  startDate?: Date,
  endDate?: Date
) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [eq(callLogs.shopId, shopId)];
  if (startDate) conditions.push(gte(callLogs.callStartedAt, startDate));
  if (endDate) conditions.push(lte(callLogs.callStartedAt, endDate));
  const result = await db
    .select({
      totalCalls: count(),
      totalRevenue: sql<string>`COALESCE(SUM(${callLogs.estimatedRevenue}), 0)`,
      appointmentsBooked: sql<number>`SUM(CASE WHEN ${callLogs.appointmentBooked} = true THEN 1 ELSE 0 END)`,
      missedCalls: sql<number>`SUM(CASE WHEN ${callLogs.status} = 'missed' THEN 1 ELSE 0 END)`,
      avgDuration: sql<string>`COALESCE(AVG(${callLogs.duration}), 0)`,
      avgSentiment: sql<string>`COALESCE(AVG(${callLogs.sentimentScore}), 0)`,
      upsellAttempts: sql<number>`SUM(CASE WHEN ${callLogs.upsellAttempted} = true THEN 1 ELSE 0 END)`,
      upsellAccepted: sql<number>`SUM(CASE WHEN ${callLogs.upsellAccepted} = true THEN 1 ELSE 0 END)`,
    })
    .from(callLogs)
    .where(and(...conditions));
  return result[0];
}

// ─── Missed Call Audits ───────────────────────────────────────────────
export async function createMissedCallAudit(data: InsertMissedCallAudit) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(missedCallAudits).values(data).returning({ id: missedCallAudits.id });
  return result[0].id;
}

export async function getMissedCallAuditById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(missedCallAudits)
    .where(eq(missedCallAudits.id, id));
  return rows[0];
}

export async function getMissedCallAudits(shopId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (shopId) {
    return db
      .select()
      .from(missedCallAudits)
      .where(eq(missedCallAudits.shopId, shopId))
      .orderBy(desc(missedCallAudits.createdAt));
  }
  return db
    .select()
    .from(missedCallAudits)
    .orderBy(desc(missedCallAudits.createdAt));
}

export async function getMissedCallAuditsByOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(missedCallAudits)
    .where(eq(missedCallAudits.ownerId, ownerId))
    .orderBy(desc(missedCallAudits.createdAt));
}

export async function updateMissedCallAudit(
  id: number,
  data: Partial<InsertMissedCallAudit>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(missedCallAudits)
    .set(data)
    .where(eq(missedCallAudits.id, id));
}

// ─── Subscriptions ────────────────────────────────────────────────────
export async function getSubscriptionByShop(shopId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.shopId, shopId))
    .limit(1);
  return result[0];
}

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(subscriptions).values(data).returning({ id: subscriptions.id });
  return result[0].id;
}

export async function updateSubscription(
  id: number,
  data: Partial<InsertSubscription>
) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}

// ─── Usage Records ────────────────────────────────────────────────────
export async function createUsageRecord(data: InsertUsageRecord) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(usageRecords).values(data).returning({ id: usageRecords.id });
  return result[0].id;
}

export async function getUsageBySubscription(subscriptionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(usageRecords)
    .where(eq(usageRecords.subscriptionId, subscriptionId))
    .orderBy(desc(usageRecords.recordedAt));
}

// ─── Notifications ────────────────────────────────────────────────────
export async function createNotification(data: InsertNotification) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(notifications).values(data).returning({ id: notifications.id });
  return result[0].id;
}

export async function getNotificationsByUser(
  userId: number,
  unreadOnly = false
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));
  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, id));
}

export async function markNotificationReadForUser(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

// ─── Contact Submissions ─────────────────────────────────────────────
export async function createContactSubmission(data: InsertContactSubmission) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(contactSubmissions).values(data).returning({ id: contactSubmissions.id });
  return result[0].id;
}
