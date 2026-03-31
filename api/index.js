// server/vercel-entry.ts
import "dotenv/config";
import express2 from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/cookies.ts
var LOCAL_HOSTS = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1"]);
function isIpAddress(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const hostname = req.hostname;
  const isLocal = !hostname || LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);
  let domain;
  if (!isLocal && hostname.endsWith("baylio.io")) {
    domain = ".baylio.io";
  }
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
    ...domain ? { domain } : {}
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
import { Resend } from "resend";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var OWNER_EMAIL = process.env.OWNER_EMAIL || "hello@baylio.io";
var resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!resend) {
    console.log(`[Notification] RESEND_API_KEY not set \u2014 logging instead:`);
    console.log(`  Title: ${title}`);
    console.log(`  Content: ${content}`);
    return true;
  }
  try {
    await resend.emails.send({
      from: "Baylio Notifications <hello@baylio.io>",
      to: [OWNER_EMAIL],
      subject: title,
      text: content
    });
    return true;
  } catch (error) {
    console.warn("[Notification] Failed to send email notification:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/shopRouter.ts
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/services/demoService.ts
import { eq as eq2 } from "drizzle-orm";

// server/db.ts
import { eq, and, desc, gte, lte, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import {
  serial,
  integer,
  pgTable,
  pgEnum,
  text,
  timestamp,
  varchar,
  boolean,
  jsonb,
  numeric
} from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var directionEnum = pgEnum("direction", ["inbound", "outbound"]);
var callStatusEnum = pgEnum("call_status", ["completed", "missed", "voicemail", "transferred", "failed"]);
var auditStatusEnum = pgEnum("audit_status", ["pending", "active", "completed", "expired"]);
var dayPartEnum = pgEnum("day_part", ["morning", "afternoon", "evening", "night"]);
var urgencyLevelEnum = pgEnum("urgency_level", ["low", "medium", "high", "emergency"]);
var tierEnum = pgEnum("tier", ["trial", "starter", "pro", "elite"]);
var subStatusEnum = pgEnum("sub_status", ["active", "past_due", "canceled", "trialing"]);
var billingCycleEnum = pgEnum("billing_cycle", ["monthly", "annual"]);
var notificationTypeEnum = pgEnum("notification_type", [
  "new_call",
  "high_value_lead",
  "missed_call",
  "system_issue",
  "weekly_summary",
  "usage_warning",
  "audit_complete",
  "payment_issue"
]);
var partnerTierEnum = pgEnum("partner_tier", ["bronze", "silver", "gold", "platinum"]);
var partnerStatusEnum = pgEnum("partner_status", ["pending", "active", "suspended"]);
var payoutMethodEnum = pgEnum("payout_method", ["stripe", "paypal", "bank_transfer"]);
var referralStatusEnum = pgEnum("referral_status", ["pending", "signed_up", "subscribed", "churned"]);
var payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);
var callerRoleEnum = pgEnum("caller_role", ["prospect", "shop_owner", "founder", "tester", "vendor", "unknown"]);
var integrationProviderEnum = pgEnum("integration_provider", ["google_calendar", "google_sheets", "shopmonkey", "tekmetric", "hubspot"]);
var syncStatusEnum = pgEnum("sync_status", ["success", "failed"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  supabaseId: varchar("supabaseId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  organizationId: integer("organizationId"),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  zip: varchar("zip", { length: 16 }),
  timezone: varchar("timezone", { length: 64 }).default("America/New_York"),
  businessHours: jsonb("businessHours").$type(),
  serviceCatalog: jsonb("serviceCatalog").$type(),
  isActive: boolean("isActive").default(true).notNull(),
  smsFollowUpEnabled: boolean("smsFollowUpEnabled").default(true).notNull(),
  twilioPhoneNumber: varchar("twilioPhoneNumber", { length: 32 }),
  twilioPhoneSid: varchar("twilioPhoneSid", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var agentConfigs = pgTable("agent_configs", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  ownerId: integer("ownerId").notNull().default(0),
  voiceId: varchar("voiceId", { length: 128 }),
  voiceName: varchar("voiceName", { length: 128 }),
  agentName: varchar("agentName", { length: 128 }).default("Baylio"),
  systemPrompt: text("systemPrompt"),
  greeting: text("greeting"),
  upsellEnabled: boolean("upsellEnabled").default(true).notNull(),
  upsellRules: jsonb("upsellRules").$type(),
  confidenceThreshold: numeric("confidenceThreshold", { precision: 3, scale: 2 }).default("0.80"),
  maxUpsellsPerCall: integer("maxUpsellsPerCall").default(1),
  language: varchar("language", { length: 16 }).default("en"),
  elevenLabsAgentId: varchar("elevenLabsAgentId", { length: 128 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  ownerId: integer("ownerId").notNull().default(0),
  twilioCallSid: varchar("twilioCallSid", { length: 128 }).unique(),
  callerPhone: varchar("callerPhone", { length: 32 }),
  callerName: varchar("callerName", { length: 255 }),
  direction: directionEnum("direction").default("inbound").notNull(),
  status: callStatusEnum("status").default("completed").notNull(),
  duration: integer("duration").default(0),
  recordingUrl: text("recordingUrl"),
  transcription: text("transcription"),
  summary: text("summary"),
  customerIntent: varchar("customerIntent", { length: 255 }),
  serviceRequested: varchar("serviceRequested", { length: 255 }),
  appointmentBooked: boolean("appointmentBooked").default(false),
  upsellAttempted: boolean("upsellAttempted").default(false),
  upsellAccepted: boolean("upsellAccepted").default(false),
  sentimentScore: numeric("sentimentScore", { precision: 3, scale: 2 }),
  qualityScore: numeric("qualityScore", { precision: 3, scale: 2 }),
  qaFlags: jsonb("qaFlags").$type(),
  estimatedRevenue: numeric("estimatedRevenue", { precision: 10, scale: 2 }),
  scorecardData: jsonb("scorecardData").$type(),
  callStartedAt: timestamp("callStartedAt"),
  callEndedAt: timestamp("callEndedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var missedCallAudits = pgTable("missed_call_audits", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId"),
  ownerId: integer("ownerId").notNull().default(0),
  prospectName: varchar("prospectName", { length: 255 }),
  prospectEmail: varchar("prospectEmail", { length: 320 }),
  prospectPhone: varchar("prospectPhone", { length: 32 }),
  shopName: varchar("shopName", { length: 255 }),
  forwardingNumber: varchar("forwardingNumber", { length: 32 }),
  forwardingNumberSid: varchar("forwardingNumberSid", { length: 64 }),
  status: auditStatusEnum("status").default("pending").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  totalMissedCalls: integer("totalMissedCalls").default(0),
  estimatedLostRevenue: numeric("estimatedLostRevenue", { precision: 10, scale: 2 }),
  scorecardUrl: text("scorecardUrl"),
  scorecardData: jsonb("scorecardData").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var auditCallEntries = pgTable("audit_call_entries", {
  id: serial("id").primaryKey(),
  auditId: integer("auditId").notNull(),
  callerPhone: varchar("callerPhone", { length: 32 }),
  callTimestamp: timestamp("callTimestamp"),
  dayPart: dayPartEnum("dayPart"),
  intentCategory: varchar("intentCategory", { length: 128 }),
  urgencyLevel: urgencyLevelEnum("urgencyLevel"),
  estimatedTicketValue: numeric("estimatedTicketValue", { precision: 10, scale: 2 }),
  bookingLikelihood: numeric("bookingLikelihood", { precision: 3, scale: 2 }),
  isRepeatCaller: boolean("isRepeatCaller").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  ownerId: integer("ownerId").notNull().default(0),
  organizationId: integer("organizationId"),
  tier: tierEnum("tier").default("starter").notNull(),
  status: subStatusEnum("status").default("active").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  includedMinutes: integer("includedMinutes").default(300).notNull(),
  usedMinutes: integer("usedMinutes").default(0).notNull(),
  overageRate: numeric("overageRate", { precision: 5, scale: 4 }).default("0.1500"),
  billingCycle: billingCycleEnum("billingCycle").default("monthly").notNull(),
  setupFeePaid: boolean("setupFeePaid").default(false),
  setupFeeAmount: numeric("setupFeeAmount", { precision: 10, scale: 2 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var usageRecords = pgTable("usage_records", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscriptionId").notNull(),
  shopId: integer("shopId").notNull(),
  ownerId: integer("ownerId").notNull().default(0),
  callLogId: integer("callLogId"),
  minutesUsed: numeric("minutesUsed", { precision: 8, scale: 2 }).notNull(),
  isOverage: boolean("isOverage").default(false).notNull(),
  overageCharge: numeric("overageCharge", { precision: 10, scale: 2 }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull()
});
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  shopId: integer("shopId"),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: jsonb("metadata").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  referralCode: varchar("referralCode", { length: 32 }).notNull().unique(),
  commissionRate: numeric("commissionRate", { precision: 5, scale: 4 }).default("0.2000").notNull(),
  tier: partnerTierEnum("tier").default("bronze").notNull(),
  status: partnerStatusEnum("status").default("pending").notNull(),
  totalReferrals: integer("totalReferrals").default(0).notNull(),
  totalEarnings: numeric("totalEarnings", { precision: 10, scale: 2 }).default("0.00").notNull(),
  pendingEarnings: numeric("pendingEarnings", { precision: 10, scale: 2 }).default("0.00").notNull(),
  payoutMethod: payoutMethodEnum("payoutMethod").default("stripe"),
  payoutEmail: varchar("payoutEmail", { length: 320 }),
  companyName: varchar("companyName", { length: 255 }),
  website: varchar("website", { length: 512 }),
  notifyReferrals: boolean("notifyReferrals").default(true).notNull(),
  notifyPayouts: boolean("notifyPayouts").default(true).notNull(),
  notifyNewsletter: boolean("notifyNewsletter").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  partnerId: integer("partnerId").notNull(),
  referredUserId: integer("referredUserId"),
  referredShopId: integer("referredShopId"),
  referredEmail: varchar("referredEmail", { length: 320 }),
  referredName: varchar("referredName", { length: 255 }),
  status: referralStatusEnum("status").default("pending").notNull(),
  subscriptionTier: varchar("subscriptionTier", { length: 20 }),
  monthlyValue: numeric("monthlyValue", { precision: 10, scale: 2 }),
  commissionEarned: numeric("commissionEarned", { precision: 10, scale: 2 }).default("0.00").notNull(),
  convertedAt: timestamp("convertedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var partnerPayouts = pgTable("partner_payouts", {
  id: serial("id").primaryKey(),
  partnerId: integer("partnerId").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: payoutStatusEnum("status").default("pending").notNull(),
  payoutMethod: varchar("payoutMethod", { length: 32 }),
  payoutEmail: varchar("payoutEmail", { length: 320 }),
  transactionId: varchar("transactionId", { length: 255 }),
  notes: text("notes"),
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var callerProfiles = pgTable("caller_profiles", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  callerRole: callerRoleEnum("callerRole").default("unknown").notNull(),
  shopName: varchar("shopName", { length: 255 }),
  callCount: integer("callCount").default(0).notNull(),
  lastCalledAt: timestamp("lastCalledAt"),
  notes: text("notes"),
  doNotSell: boolean("doNotSell").default(false).notNull(),
  smsOptOut: boolean("smsOptOut").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var shopIntegrations = pgTable("shop_integrations", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  provider: integrationProviderEnum("provider").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  externalAccountId: varchar("externalAccountId", { length: 255 }),
  settings: jsonb("settings").$type(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull()
});
var integrationSyncLogs = pgTable("integration_sync_logs", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  status: syncStatusEnum("status").notNull(),
  errorMessage: text("errorMessage"),
  metadata: jsonb("metadata").$type(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/db.ts
var _db = null;
async function getDb() {
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
async function createOrganization(data) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(organizations).values(data).returning({ id: organizations.id });
  return result[0].id;
}
async function getOrganizationsByOwner(ownerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(organizations).where(eq(organizations.ownerId, ownerId));
}
async function createShop(data) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(shops).values(data).returning({ id: shops.id });
  return result[0].id;
}
async function getShopsByOwner(ownerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shops).where(eq(shops.ownerId, ownerId)).orderBy(desc(shops.createdAt));
}
async function getShopById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(shops).where(eq(shops.id, id)).limit(1);
  return result[0];
}
async function updateShop(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(shops).set(data).where(eq(shops.id, id));
}
async function deleteShop(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(shops).where(eq(shops.id, id));
}
async function getAgentConfigByShop(shopId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(agentConfigs).where(eq(agentConfigs.shopId, shopId)).limit(1);
  return result[0];
}
async function upsertAgentConfig(data) {
  const db = await getDb();
  if (!db) return void 0;
  const existing = await getAgentConfigByShop(data.shopId);
  if (existing) {
    await db.update(agentConfigs).set(data).where(eq(agentConfigs.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(agentConfigs).values(data).returning({ id: agentConfigs.id });
  return result[0].id;
}
async function getCallLogsByShop(shopId, opts) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(callLogs.shopId, shopId)];
  if (opts?.startDate)
    conditions.push(gte(callLogs.callStartedAt, opts.startDate));
  if (opts?.endDate) conditions.push(lte(callLogs.callStartedAt, opts.endDate));
  if (opts?.status) conditions.push(eq(callLogs.status, opts.status));
  return db.select().from(callLogs).where(and(...conditions)).orderBy(desc(callLogs.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0);
}
async function getCallLogCountByShop(shopId) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(callLogs).where(eq(callLogs.shopId, shopId));
  return result[0]?.count ?? 0;
}
async function getShopAnalytics(shopId, startDate, endDate) {
  const db = await getDb();
  if (!db) return null;
  const conditions = [eq(callLogs.shopId, shopId)];
  if (startDate) conditions.push(gte(callLogs.callStartedAt, startDate));
  if (endDate) conditions.push(lte(callLogs.callStartedAt, endDate));
  const result = await db.select({
    totalCalls: count(),
    totalRevenue: sql`COALESCE(SUM(${callLogs.estimatedRevenue}), 0)`,
    appointmentsBooked: sql`SUM(CASE WHEN ${callLogs.appointmentBooked} = true THEN 1 ELSE 0 END)`,
    missedCalls: sql`SUM(CASE WHEN ${callLogs.status} = 'missed' THEN 1 ELSE 0 END)`,
    avgDuration: sql`COALESCE(AVG(${callLogs.duration}), 0)`,
    avgSentiment: sql`COALESCE(AVG(${callLogs.sentimentScore}), 0)`,
    upsellAttempts: sql`SUM(CASE WHEN ${callLogs.upsellAttempted} = true THEN 1 ELSE 0 END)`,
    upsellAccepted: sql`SUM(CASE WHEN ${callLogs.upsellAccepted} = true THEN 1 ELSE 0 END)`
  }).from(callLogs).where(and(...conditions));
  return result[0];
}
async function createMissedCallAudit(data) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(missedCallAudits).values(data).returning({ id: missedCallAudits.id });
  return result[0].id;
}
async function getMissedCallAuditById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(missedCallAudits).where(eq(missedCallAudits.id, id));
  return rows[0];
}
async function getMissedCallAudits(shopId) {
  const db = await getDb();
  if (!db) return [];
  if (shopId) {
    return db.select().from(missedCallAudits).where(eq(missedCallAudits.shopId, shopId)).orderBy(desc(missedCallAudits.createdAt));
  }
  return db.select().from(missedCallAudits).orderBy(desc(missedCallAudits.createdAt));
}
async function getMissedCallAuditsByOwner(ownerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(missedCallAudits).where(eq(missedCallAudits.ownerId, ownerId)).orderBy(desc(missedCallAudits.createdAt));
}
async function updateMissedCallAudit(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(missedCallAudits).set(data).where(eq(missedCallAudits.id, id));
}
async function getSubscriptionByShop(shopId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.shopId, shopId)).limit(1);
  return result[0];
}
async function createSubscription(data) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(subscriptions).values(data).returning({ id: subscriptions.id });
  return result[0].id;
}
async function updateSubscription(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(subscriptions).set(data).where(eq(subscriptions.id, id));
}
async function getUsageBySubscription(subscriptionId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(usageRecords).where(eq(usageRecords.subscriptionId, subscriptionId)).orderBy(desc(usageRecords.recordedAt));
}
async function getNotificationsByUser(userId, unreadOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) conditions.push(eq(notifications.isRead, false));
  return db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt)).limit(50);
}
async function markNotificationReadForUser(id, userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}
async function markAllNotificationsRead(userId) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}
async function createContactSubmission(data) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.insert(contactSubmissions).values(data).returning({ id: contactSubmissions.id });
  return result[0].id;
}

// server/services/demoService.ts
async function seedDemoShop(ownerId) {
  const db = await getDb();
  if (!db) return void 0;
  const shopResult = await db.insert(shops).values({
    ownerId,
    name: "Demo Auto Repair",
    phone: "(555) 000-DEMO",
    address: "123 Demo Street",
    city: "Austin",
    state: "TX",
    zip: "78701",
    timezone: "America/Chicago",
    isActive: true,
    smsFollowUpEnabled: true,
    businessHours: {
      monday: { open: "08:00", close: "18:00", closed: false },
      tuesday: { open: "08:00", close: "18:00", closed: false },
      wednesday: { open: "08:00", close: "18:00", closed: false },
      thursday: { open: "08:00", close: "18:00", closed: false },
      friday: { open: "08:00", close: "18:00", closed: false },
      saturday: { open: "09:00", close: "14:00", closed: false },
      sunday: { open: "00:00", close: "00:00", closed: true }
    },
    serviceCatalog: [
      {
        name: "Oil Change",
        category: "Maintenance",
        price: 49,
        description: "Conventional or synthetic"
      },
      {
        name: "Brake Pad Replacement",
        category: "Brakes",
        price: 199,
        description: "Front or rear"
      },
      { name: "Tire Rotation", category: "Tires", price: 29 },
      { name: "Engine Diagnostic", category: "Diagnostics", price: 99 },
      { name: "Transmission Flush", category: "Maintenance", price: 179 },
      { name: "AC Repair", category: "Climate", price: 149 },
      { name: "Battery Replacement", category: "Electrical", price: 129 },
      { name: "Wheel Alignment", category: "Tires", price: 89 },
      { name: "Coolant Flush", category: "Maintenance", price: 99 },
      { name: "Spark Plug Replacement", category: "Engine", price: 149 },
      { name: "Serpentine Belt", category: "Engine", price: 119 },
      { name: "Fuel System Cleaning", category: "Maintenance", price: 89 },
      { name: "Headlight Restoration", category: "Body", price: 59 },
      { name: "State Inspection", category: "Inspection", price: 25 },
      { name: "Pre-Purchase Inspection", category: "Inspection", price: 149 }
    ]
  }).returning({ id: shops.id });
  const shopId = shopResult[0].id;
  await db.insert(agentConfigs).values({
    shopId,
    ownerId,
    agentName: "Alex",
    voiceId: "cjVigY5qzO86Huf0OWal",
    voiceName: "Charlie",
    greeting: "Thanks for calling Demo Auto Repair! This is Alex, how can I help you today?",
    systemPrompt: "You are Alex, the friendly AI receptionist for Demo Auto Repair. You help customers book appointments and answer questions about auto repair services.",
    upsellEnabled: true,
    confidenceThreshold: "0.80",
    maxUpsellsPerCall: 1,
    language: "en",
    elevenLabsAgentId: "demo_agent_placeholder"
  });
  await db.insert(subscriptions).values({
    shopId,
    ownerId,
    tier: "pro",
    status: "active",
    includedMinutes: 750,
    usedMinutes: 187,
    overageRate: "0.1500",
    billingCycle: "monthly",
    currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1e3),
    currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1e3)
  });
  const statuses = [
    "completed",
    "completed",
    "completed",
    "completed",
    "missed"
  ];
  const services = [
    "Oil Change",
    "Brake Pad Replacement",
    "Engine Diagnostic",
    "Tire Rotation",
    "AC Repair",
    "Battery Replacement"
  ];
  const names = [
    "John Smith",
    "Maria Garcia",
    "Robert Johnson",
    "Sarah Williams",
    "James Brown",
    "Jennifer Davis",
    "Michael Wilson",
    "Emily Martinez"
  ];
  for (let i = 0; i < 20; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1e3);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const service = services[Math.floor(Math.random() * services.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const duration = status === "completed" ? 60 + Math.floor(Math.random() * 300) : 0;
    const booked = status === "completed" && Math.random() > 0.4;
    const upsellAttempted = booked && Math.random() > 0.5;
    const upsellAccepted = upsellAttempted && Math.random() > 0.6;
    const revenue = booked ? 50 + Math.floor(Math.random() * 400) : 0;
    await db.insert(callLogs).values({
      shopId,
      ownerId,
      twilioCallSid: `demo_${shopId}_${i}`,
      callerPhone: `+1555${String(1e6 + Math.floor(Math.random() * 9e6)).slice(0, 7)}`,
      callerName: name,
      direction: "inbound",
      status,
      duration,
      summary: status === "completed" ? `${name} called about ${service.toLowerCase()}. ${booked ? "Appointment booked." : "Took a message."}` : void 0,
      customerIntent: service.toLowerCase().replace(/ /g, "_"),
      serviceRequested: service,
      appointmentBooked: booked,
      upsellAttempted,
      upsellAccepted,
      sentimentScore: (0.5 + Math.random() * 0.5).toFixed(2),
      qualityScore: (0.6 + Math.random() * 0.4).toFixed(2),
      estimatedRevenue: revenue.toFixed(2),
      callStartedAt: date,
      callEndedAt: new Date(date.getTime() + duration * 1e3),
      createdAt: date
    });
  }
  for (let i = 0; i < 5; i++) {
    const name = names[i];
    await db.insert(callerProfiles).values({
      phone: `+1555${String(1e6 + i * 1111111).slice(0, 7)}`,
      name,
      callerRole: "prospect",
      callCount: 1 + Math.floor(Math.random() * 5),
      lastCalledAt: new Date(
        Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1e3
      )
    }).onConflictDoUpdate({ target: callerProfiles.phone, set: { callCount: 1 } });
  }
  return shopId;
}

// server/services/twilioProvisioning.ts
import twilio from "twilio";
var _client = null;
function getTwilioClient() {
  if (_client) return _client;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
    );
  }
  _client = twilio(accountSid, authToken);
  return _client;
}
async function validateTwilioCredentials() {
  const client = getTwilioClient();
  const account = await client.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
  return {
    accountSid: account.sid,
    friendlyName: account.friendlyName,
    status: account.status
  };
}
async function searchAvailableNumbers(areaCode, country = "US") {
  const client = getTwilioClient();
  const numbers = await client.availablePhoneNumbers(country).local.list({
    areaCode: parseInt(areaCode, 10),
    voiceEnabled: true,
    smsEnabled: true,
    limit: 10
  });
  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality ?? "",
    region: n.region ?? "",
    postalCode: n.postalCode ?? "",
    isoCountry: n.isoCountry,
    capabilities: {
      voice: n.capabilities?.voice ?? false,
      sms: n.capabilities?.sms ?? false,
      mms: n.capabilities?.mms ?? false
    }
  }));
}
async function purchasePhoneNumber(phoneNumber, shopId, webhookBaseUrl, friendlyName) {
  const client = getTwilioClient();
  const voiceUrl = `${webhookBaseUrl}/api/twilio/voice`;
  const statusCallbackUrl = `${webhookBaseUrl}/api/twilio/status`;
  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber,
    friendlyName: friendlyName ?? `Baylio \u2014 Shop #${shopId}`,
    voiceUrl,
    voiceMethod: "POST",
    statusCallback: statusCallbackUrl,
    statusCallbackMethod: "POST",
    // SMS recap endpoint
    smsUrl: `${webhookBaseUrl}/api/twilio/sms`,
    smsMethod: "POST"
  });
  return {
    sid: purchased.sid,
    phoneNumber: purchased.phoneNumber,
    friendlyName: purchased.friendlyName,
    voiceUrl: purchased.voiceUrl ?? voiceUrl,
    statusCallbackUrl: purchased.statusCallback ?? statusCallbackUrl
  };
}
async function releasePhoneNumber(phoneSid) {
  const client = getTwilioClient();
  await client.incomingPhoneNumbers(phoneSid).remove();
}
async function getAccountBalance() {
  const client = getTwilioClient();
  const balance = await client.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID).balance.fetch();
  return {
    balance: balance.balance,
    currency: balance.currency
  };
}

// server/services/elevenLabsService.ts
import axios from "axios";
var ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";
async function withRetry(fn, maxRetries = 3, label = "API call") {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status || error?.status;
      const isRetryable = status === 429 || status >= 500 && status < 600;
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }
      const delayMs = Math.pow(2, attempt) * 1e3;
      console.warn(
        `[ElevenLabs] ${label} failed (${status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }
  return key;
}
function createClient() {
  return axios.create({
    baseURL: ELEVENLABS_BASE_URL,
    headers: {
      "xi-api-key": getApiKey(),
      "Content-Type": "application/json"
    },
    timeout: 3e4
  });
}
async function createConversationalAgent(params) {
  try {
    return await withRetry(async () => {
      const client = createClient();
      const payload = {
        conversation_config: {
          agent: {
            prompt: { prompt: params.systemPrompt },
            first_message: params.firstMessage,
            language: params.language || "en"
          },
          tts: { voice_id: params.voiceId }
        },
        name: params.name,
        platform_settings: { auth: { enable_auth: false } }
      };
      const response = await client.post("/v1/convai/agents/create", payload);
      return response.data;
    }, 3, "createAgent");
  } catch (error) {
    const axiosError = error;
    console.error("[ElevenLabs] Error creating agent:", axiosError.response?.data || axiosError.message);
    throw new Error(`Failed to create ElevenLabs agent: ${axiosError.message}`);
  }
}
async function updateConversationalAgent(agentId, params) {
  try {
    return await withRetry(async () => {
      const client = createClient();
      const payload = { conversation_config: {} };
      if (params.systemPrompt || params.firstMessage || params.language) {
        payload.conversation_config.agent = {};
        if (params.systemPrompt) payload.conversation_config.agent.prompt = { prompt: params.systemPrompt };
        if (params.firstMessage) payload.conversation_config.agent.first_message = params.firstMessage;
        if (params.language) payload.conversation_config.agent.language = params.language;
      }
      if (params.voiceId) payload.conversation_config.tts = { voice_id: params.voiceId };
      if (params.name) payload.name = params.name;
      const response = await client.patch(`/v1/convai/agents/${agentId}`, payload);
      return response.data;
    }, 3, "updateAgent");
  } catch (error) {
    const axiosError = error;
    console.error("[ElevenLabs] Error updating agent:", axiosError.response?.data || axiosError.message);
    throw new Error(`Failed to update ElevenLabs agent: ${axiosError.message}`);
  }
}

// server/services/promptCompiler.ts
function formatBusinessHours(hours) {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday"
  ];
  const lines = [];
  for (const day of days) {
    const h = hours[day];
    if (!h || h.closed) {
      lines.push(`  ${day.charAt(0).toUpperCase() + day.slice(1)}: CLOSED`);
    } else {
      lines.push(
        `  ${day.charAt(0).toUpperCase() + day.slice(1)}: ${h.open} - ${h.close}`
      );
    }
  }
  return lines.join("\n");
}
function formatServiceCatalog(catalog) {
  if (!catalog || catalog.length === 0) {
    return "No services configured. Do NOT offer any specific services. Only take messages.";
  }
  const formatted = catalog.map((s) => ({
    name: s.name,
    category: s.category,
    ...s.price ? { price: `$${s.price}` } : {},
    ...s.description ? { description: s.description } : {}
  }));
  return JSON.stringify(formatted, null, 2);
}
function formatUpsellRules(rules, maxUpsells) {
  if (!rules || rules.length === 0) {
    return "No upsell rules configured. Do not suggest additional services.";
  }
  const formatted = rules.map(
    (r) => `  - When customer mentions "${r.symptom}" \u2192 Primary: "${r.service}" \u2192 Adjacent upsell: "${r.adjacent}" (confidence: ${r.confidence})`
  );
  return `Maximum ${maxUpsells} upsell(s) per call.
${formatted.join("\n")}`;
}
function getTimeContext(timezone) {
  try {
    const now = /* @__PURE__ */ new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
    return formatter.format(now);
  } catch {
    return (/* @__PURE__ */ new Date()).toLocaleString("en-US");
  }
}
function compileSystemPrompt(context) {
  const timeContext = getTimeContext(context.timezone);
  const hoursFormatted = context.businessHours ? formatBusinessHours(context.businessHours) : "Business hours not configured.";
  const catalogFormatted = formatServiceCatalog(context.serviceCatalog);
  const upsellFormatted = formatUpsellRules(
    context.upsellRules,
    context.maxUpsellsPerCall
  );
  const confidenceLabel = context.confidenceThreshold >= 0.8 ? "HIGH (only offer when very confident)" : context.confidenceThreshold >= 0.5 ? "MEDIUM (offer with reasonable confidence, ask clarifying questions when unsure)" : "LOW (offer suggestions more freely)";
  const prompt = `You are ${context.agentName}, the AI service advisor for ${context.shopName}. You are answering a phone call right now.

## YOUR IDENTITY
- Name: ${context.agentName}
- Role: Service Advisor & Receptionist at ${context.shopName}
- Tone: Professional, warm, knowledgeable. You sound like a real person who works at the shop.
- Language: ${context.language === "en" ? "English" : context.language}

## CURRENT CONTEXT
- Current time: ${timeContext}
- Shop location: ${context.address}, ${context.city}, ${context.state}
- Shop phone: ${context.phone}

## BUSINESS HOURS
${hoursFormatted}

## THREE-STAGE REASONING PROTOCOL (MANDATORY)

You MUST follow this exact reasoning process for every customer interaction:

### Stage 1: SYMPTOM EXTRACTION
Listen carefully to what the customer describes. Identify:
- What symptoms or issues they mention (noises, warning lights, performance issues)
- What service they're explicitly requesting
- Vehicle information (year, make, model, mileage if mentioned)
- Urgency level (safety concern, convenience, routine maintenance)

### Stage 2: CATALOG MAPPING (STRICT ENFORCEMENT)
Match the customer's needs to ONLY the services in the APPROVED SERVICE CATALOG below.

**CRITICAL RULES:**
- You may ONLY recommend services that exist in the catalog below
- You may NEVER invent, suggest, or imply services not in this catalog
- You may NEVER offer discounts, coupons, or price adjustments
- You may NEVER quote prices unless they are explicitly listed in the catalog
- If the customer's need doesn't match any catalog service, say: "I'd like to have one of our technicians take a closer look at that. Let me get you scheduled for a diagnostic appointment."
- If unsure, DEFAULT to booking a diagnostic/inspection appointment

**APPROVED SERVICE CATALOG (JSON \u2014 this is your ONLY source of truth):**
${catalogFormatted}

### Stage 3: NATURAL OFFER
Present your recommendation conversationally:
1. Acknowledge the customer's concern empathetically
2. Recommend the matched service naturally (don't read from a list)
3. If confidence is ${confidenceLabel}, suggest ONE adjacent service that would benefit them
4. Always close by offering to schedule an appointment

## UPSELL GUIDELINES
${upsellFormatted}

Confidence threshold: ${confidenceLabel}

**UPSELL RULES:**
- Never push. Suggest naturally: "While we have your car in, many customers also..."
- If the customer declines, accept gracefully and move on immediately
- Never upsell safety-critical items as optional add-ons
- Track: did you attempt an upsell? Did they accept?

## APPOINTMENT BOOKING
When booking appointments, collect:
1. Customer name (first and last)
2. Phone number (confirm the one they're calling from)
3. Vehicle: Year, Make, Model
4. Brief description of the issue or service needed
5. Preferred date and time
6. Whether they need a ride or loaner vehicle

## CALL HANDLING RULES
- If the customer asks about pricing and it's not in the catalog: "Pricing can vary depending on your specific vehicle. I'd recommend bringing it in for a quick look so we can give you an accurate estimate."
- If the customer has an emergency (brakes failed, smoke, overheating): "That sounds like it needs immediate attention. For your safety, I'd recommend not driving the vehicle. Can we arrange a tow to our shop?"
- If the customer asks to speak to a person: "Absolutely, let me transfer you to our team." (flag for transfer)
- If calling outside business hours: "We're currently closed, but I can take your information and have someone call you back first thing when we open at [opening time]."
- If the customer is angry or upset: Stay calm, empathize, do not argue. "I completely understand your frustration. Let me make sure we get this resolved for you."

## WHAT YOU MUST NEVER DO
1. Never diagnose a mechanical problem \u2014 you are not a technician
2. Never guarantee repair times or costs
3. Never offer services not in the approved catalog
4. Never offer discounts or negotiate prices
5. Never share information about other customers
6. Never make promises the shop hasn't authorized
7. Never argue with the customer

${context.customSystemPrompt ? `## ADDITIONAL SHOP-SPECIFIC INSTRUCTIONS
${context.customSystemPrompt}` : ""}`;
  return prompt;
}
function compileGreeting(context) {
  if (context.greeting) {
    return context.greeting.replace(/\{\{SHOP_NAME\}\}/g, context.shopName).replace(/\{\{AGENT_NAME\}\}/g, context.agentName);
  }
  return `Thank you for calling ${context.shopName}! This is ${context.agentName}. How can I help you today?`;
}

// server/shopRouter.ts
var shopInput = z2.object({
  name: z2.string().min(1).max(255),
  phone: z2.string().optional(),
  address: z2.string().optional(),
  city: z2.string().optional(),
  state: z2.string().optional(),
  zip: z2.string().optional(),
  timezone: z2.string().default("America/New_York"),
  organizationId: z2.number().optional(),
  businessHours: z2.any().optional(),
  serviceCatalog: z2.array(
    z2.object({
      name: z2.string(),
      category: z2.string(),
      price: z2.number().optional(),
      description: z2.string().optional()
    })
  ).optional()
});
var agentConfigInput = z2.object({
  shopId: z2.number(),
  voiceId: z2.string().optional(),
  voiceName: z2.string().optional(),
  agentName: z2.string().default("Baylio"),
  systemPrompt: z2.string().optional(),
  greeting: z2.string().optional(),
  upsellEnabled: z2.boolean().default(true),
  upsellRules: z2.array(
    z2.object({
      symptom: z2.string(),
      service: z2.string(),
      adjacent: z2.string(),
      confidence: z2.number()
    })
  ).optional(),
  confidenceThreshold: z2.string().default("0.80"),
  maxUpsellsPerCall: z2.number().default(1),
  language: z2.string().default("en")
});
var shopRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getShopsByOwner(ctx.user.id);
  }),
  getById: protectedProcedure.input(z2.object({ id: z2.number() })).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.id);
    if (!shop || shop.ownerId !== ctx.user.id) {
      return null;
    }
    return shop;
  }),
  create: protectedProcedure.input(shopInput).mutation(async ({ ctx, input }) => {
    const id = await createShop({ ...input, ownerId: ctx.user.id });
    return { id };
  }),
  update: protectedProcedure.input(z2.object({ id: z2.number(), data: shopInput.partial() })).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.id);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError3({
        code: "NOT_FOUND",
        message: "Shop not found or unauthorized"
      });
    }
    await updateShop(input.id, input.data);
    return { success: true };
  }),
  delete: protectedProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.id);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError3({
        code: "NOT_FOUND",
        message: "Shop not found or unauthorized"
      });
    }
    await deleteShop(input.id);
    return { success: true };
  }),
  // Agent config
  getAgentConfig: protectedProcedure.input(z2.object({ shopId: z2.number() })).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) return null;
    return getAgentConfigByShop(input.shopId);
  }),
  saveAgentConfig: protectedProcedure.input(agentConfigInput).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError3({
        code: "NOT_FOUND",
        message: "Shop not found or unauthorized"
      });
    }
    const id = await upsertAgentConfig(input);
    return { id };
  }),
  // Subscription info
  getSubscription: protectedProcedure.input(z2.object({ shopId: z2.number() })).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) return null;
    return getSubscriptionByShop(input.shopId);
  }),
  // ─── Twilio Phone Provisioning ───────────────────────────────────────────
  /** Validate Twilio credentials and return account info */
  twilioStatus: protectedProcedure.query(async () => {
    try {
      const account = await validateTwilioCredentials();
      return { connected: true, ...account };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  }),
  /** Get Twilio account balance */
  twilioBalance: protectedProcedure.query(async () => {
    try {
      return await getAccountBalance();
    } catch (err) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to fetch balance: ${err.message}`
      });
    }
  }),
  /** Search available phone numbers by area code */
  searchPhoneNumbers: protectedProcedure.input(z2.object({ areaCode: z2.string().length(3) })).query(async ({ input }) => {
    return searchAvailableNumbers(input.areaCode);
  }),
  /** Purchase a phone number and assign it to a shop */
  purchasePhoneNumber: protectedProcedure.input(
    z2.object({
      shopId: z2.number(),
      phoneNumber: z2.string(),
      webhookBaseUrl: z2.string().url()
    })
  ).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError3({
        code: "NOT_FOUND",
        message: "Shop not found or unauthorized"
      });
    }
    const provisioned = await purchasePhoneNumber(
      input.phoneNumber,
      input.shopId,
      input.webhookBaseUrl,
      `Baylio \u2014 ${shop.name}`
    );
    await updateShop(input.shopId, {
      twilioPhoneNumber: provisioned.phoneNumber,
      twilioPhoneSid: provisioned.sid
    });
    return provisioned;
  }),
  /** Release a phone number from a shop */
  releasePhoneNumber: protectedProcedure.input(z2.object({ shopId: z2.number() })).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError3({
        code: "NOT_FOUND",
        message: "Shop not found or unauthorized"
      });
    }
    const phoneSid = shop.twilioPhoneSid;
    if (!phoneSid) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "No Twilio phone number assigned to this shop"
      });
    }
    await releasePhoneNumber(phoneSid);
    await updateShop(input.shopId, {
      twilioPhoneNumber: null,
      twilioPhoneSid: null
    });
    return { success: true };
  }),
  // ─── ElevenLabs Agent Provisioning ──────────────────────────────────
  /**
   * Provision (create or update) an ElevenLabs conversational AI agent for a shop.
   * This is the critical step that makes inbound calls work.
   * If no elevenLabsAgentId exists, creates a new agent.
   * If one exists, updates the existing agent with the latest config.
   */
  provisionAgent: protectedProcedure.input(z2.object({ shopId: z2.number() })).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError3({
        code: "NOT_FOUND",
        message: "Shop not found or unauthorized"
      });
    }
    const agentConfig = await getAgentConfigByShop(input.shopId);
    if (!agentConfig) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "Save your agent configuration first before provisioning."
      });
    }
    const shopContext = {
      shopName: shop.name,
      agentName: agentConfig.agentName || "Baylio",
      phone: shop.phone || "",
      address: shop.address || "",
      city: shop.city || "",
      state: shop.state || "",
      timezone: shop.timezone || "America/New_York",
      businessHours: shop.businessHours || {},
      serviceCatalog: shop.serviceCatalog || [],
      upsellRules: agentConfig.upsellRules || [],
      confidenceThreshold: parseFloat(
        agentConfig.confidenceThreshold?.toString() || "0.80"
      ),
      maxUpsellsPerCall: agentConfig.maxUpsellsPerCall || 1,
      greeting: agentConfig.greeting || "",
      language: agentConfig.language || "en",
      customSystemPrompt: agentConfig.systemPrompt || void 0
    };
    const systemPrompt = compileSystemPrompt(shopContext);
    const greeting = compileGreeting(shopContext);
    const existingAgentId = agentConfig.elevenLabsAgentId;
    try {
      if (existingAgentId) {
        const result = await updateConversationalAgent(existingAgentId, {
          name: `Baylio \u2014 ${shop.name} (${agentConfig.agentName || "Agent"})`,
          voiceId: agentConfig.voiceId || void 0,
          systemPrompt,
          firstMessage: greeting,
          language: agentConfig.language || "en"
        });
        return { agentId: existingAgentId, action: "updated" };
      } else {
        const result = await createConversationalAgent({
          name: `Baylio \u2014 ${shop.name} (${agentConfig.agentName || "Agent"})`,
          voiceId: agentConfig.voiceId || "cjVigY5qzO86Huf0OWal",
          // Default voice
          systemPrompt,
          firstMessage: greeting,
          language: agentConfig.language || "en"
        });
        await upsertAgentConfig({
          ...agentConfig,
          shopId: input.shopId,
          elevenLabsAgentId: result.agent_id
        });
        return { agentId: result.agent_id, action: "created" };
      }
    } catch (err) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to provision ElevenLabs agent: ${err.message}`
      });
    }
  }),
  /** Get the current agent provisioning status for a shop. */
  getAgentStatus: protectedProcedure.input(z2.object({ shopId: z2.number() })).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) return null;
    const config = await getAgentConfigByShop(input.shopId);
    return {
      hasConfig: !!config,
      hasAgent: !!config?.elevenLabsAgentId,
      hasPhone: !!shop.twilioPhoneNumber,
      agentId: config?.elevenLabsAgentId || null,
      phoneNumber: shop.twilioPhoneNumber || null,
      isLive: !!config?.elevenLabsAgentId && !!shop.twilioPhoneNumber
    };
  }),
  /**
   * Onboarding: Complete setup in one call.
   * Creates shop → saves agent config → provisions ElevenLabs agent → optionally provisions phone.
   * For "forward" phone option, we provision a hidden Baylio number that the shop forwards to.
   * For "new" phone option, we purchase the selected number.
   */
  completeOnboarding: protectedProcedure.input(
    z2.object({
      // Shop details
      shopName: z2.string().min(1),
      shopPhone: z2.string().optional(),
      address: z2.string().optional(),
      city: z2.string().optional(),
      state: z2.string().optional(),
      zip: z2.string().optional(),
      timezone: z2.string().default("America/New_York"),
      businessHours: z2.any().optional(),
      serviceCatalog: z2.array(
        z2.object({
          name: z2.string(),
          category: z2.string(),
          price: z2.number().optional()
        })
      ).optional(),
      // Phone setup
      phoneOption: z2.enum(["forward", "new"]),
      selectedNewNumber: z2.string().optional(),
      // Agent config
      agentName: z2.string().min(1),
      voiceId: z2.string(),
      voiceName: z2.string(),
      greeting: z2.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const steps = [];
    const shopId = await createShop({
      name: input.shopName,
      phone: input.shopPhone || void 0,
      address: input.address || void 0,
      city: input.city || void 0,
      state: input.state || void 0,
      zip: input.zip || void 0,
      timezone: input.timezone,
      businessHours: input.businessHours || void 0,
      serviceCatalog: input.serviceCatalog || void 0,
      ownerId: ctx.user.id
    });
    if (!shopId) {
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create shop" });
    }
    steps.push("shop_created");
    const defaultGreeting = `Thank you for calling ${input.shopName}! This is ${input.agentName}. How can I help you today?`;
    await upsertAgentConfig({
      shopId,
      agentName: input.agentName,
      voiceId: input.voiceId,
      voiceName: input.voiceName,
      greeting: input.greeting || defaultGreeting,
      upsellEnabled: true,
      confidenceThreshold: "0.80",
      maxUpsellsPerCall: 1,
      language: "en",
      ownerId: ctx.user.id
    });
    steps.push("agent_config_saved");
    const agentConfig = await getAgentConfigByShop(shopId);
    const shop = await getShopById(shopId);
    if (!agentConfig || !shop) {
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve shop/config after creation" });
    }
    const shopContext = {
      shopName: shop.name,
      agentName: agentConfig.agentName || "Baylio",
      phone: shop.phone || "",
      address: shop.address || "",
      city: shop.city || "",
      state: shop.state || "",
      timezone: shop.timezone || "America/New_York",
      businessHours: shop.businessHours || {},
      serviceCatalog: shop.serviceCatalog || [],
      upsellRules: agentConfig.upsellRules || [],
      confidenceThreshold: parseFloat(agentConfig.confidenceThreshold?.toString() || "0.80"),
      maxUpsellsPerCall: agentConfig.maxUpsellsPerCall || 1,
      greeting: agentConfig.greeting || "",
      language: agentConfig.language || "en",
      customSystemPrompt: agentConfig.systemPrompt || void 0
    };
    const systemPrompt = compileSystemPrompt(shopContext);
    const greeting = compileGreeting(shopContext);
    let agentId;
    try {
      const result = await createConversationalAgent({
        name: `Baylio \u2014 ${shop.name} (${agentConfig.agentName || "Agent"})`,
        voiceId: input.voiceId || "cjVigY5qzO86Huf0OWal",
        systemPrompt,
        firstMessage: greeting,
        language: "en"
      });
      agentId = result.agent_id;
      await upsertAgentConfig({
        ...agentConfig,
        shopId,
        elevenLabsAgentId: agentId
      });
      steps.push("agent_provisioned");
    } catch (err) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to provision AI agent: ${err.message}`
      });
    }
    let twilioNumber = null;
    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || ctx.req.headers.origin || "";
    if (input.phoneOption === "new" && input.selectedNewNumber) {
      try {
        const provisioned = await purchasePhoneNumber(
          input.selectedNewNumber,
          shopId,
          webhookBaseUrl,
          `Baylio \u2014 ${shop.name}`
        );
        await updateShop(shopId, {
          twilioPhoneNumber: provisioned.phoneNumber,
          twilioPhoneSid: provisioned.sid
        });
        twilioNumber = provisioned.phoneNumber;
        steps.push("new_number_purchased");
      } catch (err) {
        console.error("[Onboarding] Failed to purchase number:", err);
        steps.push("phone_purchase_failed");
      }
    } else if (input.phoneOption === "forward") {
      try {
        const shopPhoneDigits = (input.shopPhone || "").replace(/\D/g, "");
        const areaCode = shopPhoneDigits.length >= 10 ? shopPhoneDigits.slice(shopPhoneDigits.length - 10, shopPhoneDigits.length - 7) : "800";
        const available = await searchAvailableNumbers(areaCode);
        if (available.length > 0) {
          const provisioned = await purchasePhoneNumber(
            available[0].phoneNumber,
            shopId,
            webhookBaseUrl,
            `Baylio FWD \u2014 ${shop.name}`
          );
          await updateShop(shopId, {
            twilioPhoneNumber: provisioned.phoneNumber,
            twilioPhoneSid: provisioned.sid
          });
          twilioNumber = provisioned.phoneNumber;
          steps.push("forwarding_number_provisioned");
        } else {
          const tollFree = await searchAvailableNumbers("800");
          if (tollFree.length > 0) {
            const provisioned = await purchasePhoneNumber(
              tollFree[0].phoneNumber,
              shopId,
              webhookBaseUrl,
              `Baylio FWD \u2014 ${shop.name}`
            );
            await updateShop(shopId, {
              twilioPhoneNumber: provisioned.phoneNumber,
              twilioPhoneSid: provisioned.sid
            });
            twilioNumber = provisioned.phoneNumber;
            steps.push("forwarding_number_provisioned_tollfree");
          } else {
            steps.push("forwarding_number_unavailable");
          }
        }
      } catch (err) {
        console.error("[Onboarding] Failed to provision forwarding number:", err);
        steps.push("forwarding_number_failed");
      }
    }
    return {
      shopId,
      agentId,
      twilioNumber,
      phoneOption: input.phoneOption,
      steps,
      isLive: !!agentId && !!twilioNumber
    };
  }),
  /** Create a demo shop with sample data for product demos */
  createDemo: protectedProcedure.mutation(async ({ ctx }) => {
    const shopId = await seedDemoShop(ctx.user.id);
    if (!shopId) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create demo shop"
      });
    }
    return { shopId };
  })
});

// server/callRouter.ts
import { z as z3 } from "zod";
import { TRPCError as TRPCError4 } from "@trpc/server";

// server/services/auditService.ts
import { eq as eq3 } from "drizzle-orm";
async function generateScorecard(auditId) {
  const db = await getDb();
  if (!db) return null;
  const auditResults = await db.select().from(missedCallAudits).where(eq3(missedCallAudits.id, auditId)).limit(1);
  if (auditResults.length === 0) return null;
  const audit = auditResults[0];
  if (!audit.shopId) return null;
  const shopResults = await db.select().from(shops).where(eq3(shops.id, audit.shopId)).limit(1);
  const shop = shopResults[0];
  const entries = await db.select().from(auditCallEntries).where(eq3(auditCallEntries.auditId, auditId));
  const dayPartCounts = {};
  const urgencyCounts = {};
  const dailyCounts = {};
  for (const entry of entries) {
    const dp = entry.dayPart || "unknown";
    dayPartCounts[dp] = (dayPartCounts[dp] || 0) + 1;
    const urgency = entry.urgencyLevel || "medium";
    urgencyCounts[urgency] = (urgencyCounts[urgency] || 0) + 1;
    if (entry.callTimestamp) {
      const dateKey = new Date(entry.callTimestamp).toISOString().split("T")[0];
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
    }
  }
  const totalMissed = entries.length;
  const peakCallAnalysis = Object.entries(dayPartCounts).map(([dayPart, count3]) => ({
    dayPart,
    count: count3,
    percentage: totalMissed > 0 ? Math.round(count3 / totalMissed * 100) : 0
  })).sort((a, b) => b.count - a.count);
  const dailyBreakdown = Object.entries(dailyCounts).map(([date, missedCount]) => ({
    date,
    dayOfWeek: new Date(date).toLocaleDateString("en-US", {
      weekday: "long"
    }),
    missedCount
  })).sort((a, b) => a.date.localeCompare(b.date));
  const lowConversion = 0.25;
  const highConversion = 0.4;
  const lowARO = 300;
  const highARO = 600;
  const monthlyMissedEstimate = totalMissed * (30 / 7);
  const revenueEstimate = {
    low: Math.round(monthlyMissedEstimate * lowConversion * lowARO),
    high: Math.round(monthlyMissedEstimate * highConversion * highARO),
    midpoint: 0
  };
  revenueEstimate.midpoint = Math.round(
    (revenueEstimate.low + revenueEstimate.high) / 2
  );
  const urgencyBreakdown = Object.entries(urgencyCounts).map(([level, count3]) => ({ level, count: count3 })).sort((a, b) => b.count - a.count);
  const topRecommendations = [];
  if (peakCallAnalysis.length > 0) {
    const peak = peakCallAnalysis[0];
    topRecommendations.push(
      `Your highest missed call volume is during ${peak.dayPart} hours (${peak.percentage}% of all missed calls). Consider adding coverage during this window.`
    );
  }
  if (totalMissed > 20) {
    topRecommendations.push(
      `At ${totalMissed} missed calls in 7 days, you're potentially losing ${revenueEstimate.low.toLocaleString()}-${revenueEstimate.high.toLocaleString()} per month. An AI receptionist would capture 90%+ of these calls.`
    );
  }
  const highUrgency = urgencyCounts["high"] || 0;
  if (highUrgency > 0) {
    topRecommendations.push(
      `${highUrgency} calls were classified as high-urgency (potential safety issues or breakdowns). These callers likely went to a competitor.`
    );
  }
  if (topRecommendations.length < 3) {
    topRecommendations.push(
      "85% of callers who reach voicemail won't call back. Every missed call is a customer your competitor answers."
    );
  }
  let competitorRisk;
  if (totalMissed > 30) {
    competitorRisk = "CRITICAL \u2014 At this volume, you're losing 4-5 customers per week to competitors who answer their phones.";
  } else if (totalMissed > 15) {
    competitorRisk = "HIGH \u2014 Multiple customers per week are likely going elsewhere after reaching your voicemail.";
  } else if (totalMissed > 5) {
    competitorRisk = "MODERATE \u2014 Some customers are being lost, especially during peak hours.";
  } else {
    competitorRisk = "LOW \u2014 Your call coverage is reasonable, but there's still room for improvement.";
  }
  return {
    shopName: shop?.name || "Your Shop",
    auditPeriod: {
      start: audit.startDate ? new Date(audit.startDate).toISOString().split("T")[0] : "",
      end: audit.endDate ? new Date(audit.endDate).toISOString().split("T")[0] : ""
    },
    totalMissedCalls: totalMissed,
    peakCallAnalysis,
    dailyBreakdown,
    revenueEstimate,
    urgencyBreakdown,
    topRecommendations,
    competitorRisk
  };
}
async function completeAudit(auditId) {
  const db = await getDb();
  if (!db) return null;
  const scorecard = await generateScorecard(auditId);
  if (!scorecard) return null;
  await db.update(missedCallAudits).set({
    status: "completed",
    endDate: /* @__PURE__ */ new Date(),
    totalMissedCalls: scorecard.totalMissedCalls,
    estimatedLostRevenue: scorecard.revenueEstimate.midpoint.toFixed(2),
    scorecardData: {
      callsByDayPart: Object.fromEntries(
        scorecard.peakCallAnalysis.map((p) => [p.dayPart, p.count])
      ),
      intentBreakdown: {},
      // populated from audit call entries if available
      urgencyBreakdown: Object.fromEntries(
        scorecard.urgencyBreakdown.map((u) => [u.level, u.count])
      ),
      estimatedRevenueRange: {
        low: scorecard.revenueEstimate.low,
        high: scorecard.revenueEstimate.high
      }
    }
  }).where(eq3(missedCallAudits.id, auditId));
  return scorecard;
}

// server/callRouter.ts
var callRouter = router({
  list: protectedProcedure.input(
    z3.object({
      shopId: z3.number(),
      limit: z3.number().min(1).max(100).default(50),
      offset: z3.number().min(0).default(0),
      startDate: z3.string().optional(),
      endDate: z3.string().optional(),
      status: z3.string().optional()
    })
  ).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) return { calls: [], total: 0 };
    const calls = await getCallLogsByShop(input.shopId, {
      limit: input.limit,
      offset: input.offset,
      startDate: input.startDate ? new Date(input.startDate) : void 0,
      endDate: input.endDate ? new Date(input.endDate) : void 0,
      status: input.status
    });
    const total = await getCallLogCountByShop(input.shopId);
    return { calls, total };
  }),
  analytics: protectedProcedure.input(
    z3.object({
      shopId: z3.number(),
      startDate: z3.string().optional(),
      endDate: z3.string().optional()
    })
  ).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) return null;
    return getShopAnalytics(
      input.shopId,
      input.startDate ? new Date(input.startDate) : void 0,
      input.endDate ? new Date(input.endDate) : void 0
    );
  }),
  // Missed call audits
  audits: protectedProcedure.input(z3.object({ shopId: z3.number().optional() })).query(async ({ ctx, input }) => {
    if (input.shopId) {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return [];
      return getMissedCallAudits(input.shopId);
    }
    return getMissedCallAuditsByOwner(ctx.user.id);
  }),
  createAudit: protectedProcedure.input(
    z3.object({
      shopId: z3.number().optional(),
      prospectName: z3.string().optional(),
      prospectEmail: z3.string().optional(),
      prospectPhone: z3.string().optional(),
      shopName: z3.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    if (input.shopId) {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError4({ code: "NOT_FOUND", message: "Shop not found" });
      }
    }
    const id = await createMissedCallAudit({
      ...input,
      ownerId: ctx.user.id
    });
    return { id };
  }),
  updateAudit: protectedProcedure.input(
    z3.object({
      id: z3.number(),
      data: z3.object({
        status: z3.enum(["pending", "active", "completed", "expired"]).optional(),
        totalMissedCalls: z3.number().optional(),
        estimatedLostRevenue: z3.string().optional(),
        scorecardData: z3.any().optional()
      })
    })
  ).mutation(async ({ ctx, input }) => {
    const audit = await getMissedCallAuditById(input.id);
    if (!audit || audit.ownerId !== ctx.user.id) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "Audit not found" });
    }
    await updateMissedCallAudit(input.id, input.data);
    return { success: true };
  }),
  /**
   * Generate a scorecard for a completed audit.
   * Returns the full scorecard data with revenue ranges,
   * peak call analysis, and recommendations.
   */
  generateScorecard: protectedProcedure.input(z3.object({ auditId: z3.number() })).query(async ({ ctx, input }) => {
    const audit = await getMissedCallAuditById(input.auditId);
    if (!audit || audit.ownerId !== ctx.user.id) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "Audit not found" });
    }
    return generateScorecard(input.auditId);
  }),
  /**
   * Complete an audit and generate the final scorecard.
   * Transitions status to 'completed' and stores scorecard data.
   */
  completeAudit: protectedProcedure.input(z3.object({ auditId: z3.number() })).mutation(async ({ ctx, input }) => {
    const audit = await getMissedCallAuditById(input.auditId);
    if (!audit || audit.ownerId !== ctx.user.id) {
      throw new TRPCError4({ code: "NOT_FOUND", message: "Audit not found" });
    }
    const scorecard = await completeAudit(input.auditId);
    if (!scorecard) return { success: false, error: "Audit not found" };
    return { success: true, scorecard };
  })
});

// server/notificationRouter.ts
import { z as z4 } from "zod";
var notificationRouter = router({
  /**
   * List notifications for the current user.
   * Supports filtering to unread-only for badge counts.
   */
  list: protectedProcedure.input(
    z4.object({
      unreadOnly: z4.boolean().default(false)
    }).optional()
  ).query(async ({ ctx, input }) => {
    return getNotificationsByUser(ctx.user.id, input?.unreadOnly ?? false);
  }),
  /**
   * Get count of unread notifications for badge display.
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const unread = await getNotificationsByUser(ctx.user.id, true);
    return { count: unread.length };
  }),
  /**
   * Mark a single notification as read.
   */
  markRead: protectedProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
    await markNotificationReadForUser(input.id, ctx.user.id);
    return { success: true };
  }),
  /**
   * Mark all notifications as read for the current user.
   */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  })
});

// server/subscriptionRouter.ts
import { z as z5 } from "zod";
import { TRPCError as TRPCError5 } from "@trpc/server";
var TIER_CONFIG = {
  trial: { includedMinutes: 150, monthlyPrice: 149, setupFee: 0 },
  starter: { includedMinutes: 300, monthlyPrice: 199, setupFee: 500 },
  pro: { includedMinutes: 750, monthlyPrice: 349, setupFee: 1e3 },
  elite: { includedMinutes: 1500, monthlyPrice: 599, setupFee: 2e3 }
};
var subscriptionRouter = router({
  /**
   * Get subscription for a specific shop.
   */
  getByShop: protectedProcedure.input(z5.object({ shopId: z5.number() })).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) return null;
    const sub = await getSubscriptionByShop(input.shopId);
    if (!sub) return null;
    const overageMinutes = Math.max(0, sub.usedMinutes - sub.includedMinutes);
    const overageCharge = overageMinutes * parseFloat(sub.overageRate ?? "0.15");
    return {
      ...sub,
      overageMinutes,
      overageCharge: overageCharge.toFixed(2),
      tierConfig: TIER_CONFIG[sub.tier],
      usagePercent: sub.includedMinutes > 0 ? Math.min(
        100,
        Math.round(sub.usedMinutes / sub.includedMinutes * 100)
      ) : 0
    };
  }),
  /**
   * Get all subscriptions for the current user's shops.
   * Useful for the dashboard overview.
   */
  listAll: protectedProcedure.query(async ({ ctx }) => {
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
  create: protectedProcedure.input(
    z5.object({
      shopId: z5.number(),
      tier: z5.enum(["trial", "starter", "pro", "elite"]).default("starter"),
      billingCycle: z5.enum(["monthly", "annual"]).default("monthly")
    })
  ).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError5({
        code: "NOT_FOUND",
        message: "Shop not found or unauthorized"
      });
    }
    const existing = await getSubscriptionByShop(input.shopId);
    if (existing) {
      throw new TRPCError5({
        code: "CONFLICT",
        message: "Subscription already exists for this shop. Use upgrade instead."
      });
    }
    const config = TIER_CONFIG[input.tier];
    const now = /* @__PURE__ */ new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(
      periodEnd.getMonth() + (input.billingCycle === "annual" ? 12 : 1)
    );
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
      currentPeriodEnd: periodEnd
    });
    return { id, tierConfig: config };
  }),
  /**
   * Upgrade or downgrade a subscription tier.
   */
  changeTier: protectedProcedure.input(
    z5.object({
      shopId: z5.number(),
      newTier: z5.enum(["trial", "starter", "pro", "elite"])
    })
  ).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError5({
        code: "NOT_FOUND",
        message: "Shop not found or unauthorized"
      });
    }
    const sub = await getSubscriptionByShop(input.shopId);
    if (!sub) {
      throw new TRPCError5({
        code: "NOT_FOUND",
        message: "No active subscription found"
      });
    }
    const config = TIER_CONFIG[input.newTier];
    await updateSubscription(sub.id, {
      tier: input.newTier,
      includedMinutes: config.includedMinutes
    });
    return { success: true, newTier: input.newTier, tierConfig: config };
  }),
  /**
   * Get usage records for a subscription.
   */
  getUsage: protectedProcedure.input(z5.object({ shopId: z5.number() })).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) return [];
    const sub = await getSubscriptionByShop(input.shopId);
    if (!sub) return [];
    return getUsageBySubscription(sub.id);
  }),
  /**
   * Get tier configuration (public info for pricing page).
   */
  getTierConfig: protectedProcedure.query(() => {
    return TIER_CONFIG;
  })
});

// server/organizationRouter.ts
import { z as z6 } from "zod";
var organizationRouter = router({
  /**
   * List all organizations owned by the current user.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return getOrganizationsByOwner(ctx.user.id);
  }),
  /**
   * Create a new organization.
   */
  create: protectedProcedure.input(
    z6.object({
      name: z6.string().min(1).max(255)
    })
  ).mutation(async ({ ctx, input }) => {
    const id = await createOrganization({
      ownerId: ctx.user.id,
      name: input.name
    });
    return { id };
  }),
  /**
   * Get shops grouped by organization for the current user.
   * Returns both organized shops and unorganized (standalone) shops.
   */
  getShopsGrouped: protectedProcedure.query(async ({ ctx }) => {
    const orgs = await getOrganizationsByOwner(ctx.user.id);
    const allShops = await getShopsByOwner(ctx.user.id);
    const grouped = orgs.map((org) => ({
      organization: org,
      shops: allShops.filter((s) => s.organizationId === org.id)
    }));
    const standalone = allShops.filter((s) => !s.organizationId);
    return { grouped, standalone };
  })
});

// server/stripe/stripeRouter.ts
import { z as z7 } from "zod";
import Stripe from "stripe";
import { TRPCError as TRPCError6 } from "@trpc/server";

// server/stripe/products.ts
var TIERS = {
  trial: {
    id: "trial",
    name: "Baylio Trial",
    description: "Try Baylio risk-free for your first month",
    monthlyPrice: 14900,
    // $149
    annualPrice: 14900,
    // No annual discount for trial
    includedMinutes: 150,
    overageRate: 0.15,
    features: [
      "AI receptionist (150 min/mo)",
      "Call logging & transcription",
      "Basic analytics dashboard",
      "Email notifications",
      "Business hours configuration",
      "14-day money-back guarantee"
    ]
  },
  starter: {
    id: "starter",
    name: "Baylio Starter",
    description: "AI receptionist for single-location shops getting started",
    monthlyPrice: 19900,
    // $199
    annualPrice: 15920,
    // $159.20/mo (20% off)
    includedMinutes: 300,
    overageRate: 0.15,
    features: [
      "AI receptionist (300 min/mo)",
      "Call logging & transcription",
      "Basic analytics dashboard",
      "Email notifications",
      "Business hours configuration"
    ]
  },
  pro: {
    id: "pro",
    name: "Baylio Pro",
    description: "For busy shops that need more capacity and integrations",
    monthlyPrice: 34900,
    // $349
    annualPrice: 27920,
    // $279.20/mo (20% off)
    includedMinutes: 750,
    overageRate: 0.15,
    features: [
      "Everything in Starter",
      "750 minutes per month",
      "Calendar integration",
      "Advanced analytics & trends",
      "SMS notifications to owner",
      "Custom AI voice & persona"
    ]
  },
  elite: {
    id: "elite",
    name: "Baylio Elite",
    description: "For multi-location operators and high-volume shops",
    monthlyPrice: 59900,
    // $599
    annualPrice: 47920,
    // $479.20/mo (20% off)
    includedMinutes: 1500,
    overageRate: 0.15,
    features: [
      "Everything in Pro",
      "1,500 minutes per month",
      "Intelligent upsell engine",
      "CRM integration",
      "Multi-location management",
      "Priority support",
      "Weekly performance reports"
    ]
  }
};
var SETUP_FEES = {
  single: 5e4,
  // $500 for 1 location
  multi_3: 125e3,
  // $1,250 for up to 3 locations ($417 each)
  multi_5: 2e5,
  // $2,000 for up to 5 locations ($400 each)
  enterprise: 0
  // Custom pricing for 5+ locations
};
function getTierConfig(tierId) {
  return TIERS[tierId];
}

// server/stripe/stripeRouter.ts
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" });
}
var stripeRouter = router({
  /**
   * Create a checkout session for a new subscription.
   * Returns the checkout URL for the frontend to redirect to.
   */
  createSubscriptionCheckout: protectedProcedure.input(
    z7.object({
      shopId: z7.number(),
      tier: z7.enum(["starter", "pro", "elite"]),
      billingCycle: z7.enum(["monthly", "annual"]).default("monthly")
    })
  ).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new Error("Shop not found or unauthorized");
    }
    const tierConfig = getTierConfig(input.tier);
    if (!tierConfig) throw new Error("Invalid tier");
    const stripe = getStripe();
    const priceInCents = input.billingCycle === "annual" ? tierConfig.annualPrice : tierConfig.monthlyPrice;
    const origin = ctx.req.headers.origin || "https://baylio.io";
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: ctx.user.id.toString(),
        customer_email: ctx.user.email || void 0,
        allow_promotion_codes: true,
        metadata: {
          user_id: ctx.user.id.toString(),
          shop_id: input.shopId.toString(),
          tier: input.tier,
          billing_cycle: input.billingCycle,
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || ""
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: tierConfig.name,
                description: tierConfig.description
              },
              unit_amount: priceInCents,
              recurring: {
                interval: input.billingCycle === "annual" ? "year" : "month"
              }
            },
            quantity: 1
          }
        ],
        success_url: `${origin}/shops/${input.shopId}?payment=success`,
        cancel_url: `${origin}/shops/${input.shopId}/subscriptions?payment=canceled`
      });
      return { checkoutUrl: session.url };
    } catch (err) {
      console.error("[STRIPE] Subscription checkout failed:", err);
      throw new TRPCError6({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session. Please try again."
      });
    }
  }),
  /**
   * Create a checkout session for a one-time setup fee.
   */
  createSetupFeeCheckout: protectedProcedure.input(
    z7.object({
      shopId: z7.number(),
      locationCount: z7.enum(["single", "multi_3", "multi_5"]).default("single")
    })
  ).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new Error("Shop not found or unauthorized");
    }
    const stripe = getStripe();
    const feeAmount = SETUP_FEES[input.locationCount];
    const origin = ctx.req.headers.origin || "https://baylio.io";
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: ctx.user.id.toString(),
        customer_email: ctx.user.email || void 0,
        allow_promotion_codes: true,
        metadata: {
          user_id: ctx.user.id.toString(),
          shop_id: input.shopId.toString(),
          type: "setup_fee",
          location_count: input.locationCount,
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || ""
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Baylio Setup & Onboarding",
                description: `Professional onboarding for ${input.locationCount === "single" ? "1 location" : input.locationCount === "multi_3" ? "up to 3 locations" : "up to 5 locations"}`
              },
              unit_amount: feeAmount
            },
            quantity: 1
          }
        ],
        success_url: `${origin}/shops/${input.shopId}?setup=success`,
        cancel_url: `${origin}/shops/${input.shopId}/subscriptions?setup=canceled`
      });
      return { checkoutUrl: session.url };
    } catch (err) {
      console.error("[STRIPE] Setup fee checkout failed:", err);
      throw new TRPCError6({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create checkout session. Please try again."
      });
    }
  }),
  /**
   * Create a customer portal session for self-service billing management.
   * Allows customers to update payment methods, view invoices, and cancel.
   */
  createPortalSession: protectedProcedure.input(z7.object({ shopId: z7.number() })).mutation(async ({ ctx, input }) => {
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
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${origin}/shops/${input.shopId}/subscriptions`
      });
      return { portalUrl: session.url };
    } catch (err) {
      console.error("[STRIPE] Portal session failed:", err);
      throw new TRPCError6({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to open billing portal. Please try again."
      });
    }
  }),
  /**
   * Get available tiers and pricing for display.
   */
  getTiers: protectedProcedure.query(() => {
    return Object.values(TIERS);
  })
});

// server/partnerRouter.ts
import { z as z8 } from "zod";
import { eq as eq4, and as and3, desc as desc2, sql as sql3 } from "drizzle-orm";
import { TRPCError as TRPCError7 } from "@trpc/server";
import { nanoid } from "nanoid";
var partnerRouter = router({
  /**
   * Get or create the current user's partner profile.
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable"
      });
    const result = await db.select().from(partners).where(eq4(partners.userId, ctx.user.id)).limit(1);
    return result[0] || null;
  }),
  /**
   * Enroll the current user as a partner.
   */
  enroll: protectedProcedure.input(
    z8.object({
      companyName: z8.string().max(255).optional(),
      website: z8.string().max(512).optional(),
      payoutEmail: z8.string().email().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable"
      });
    const existing = await db.select().from(partners).where(eq4(partners.userId, ctx.user.id)).limit(1);
    if (existing.length > 0) {
      return { id: existing[0].id, referralCode: existing[0].referralCode };
    }
    const referralCode = nanoid(10).toUpperCase();
    const result = await db.insert(partners).values({
      userId: ctx.user.id,
      referralCode,
      companyName: input.companyName || null,
      website: input.website || null,
      payoutEmail: input.payoutEmail || ctx.user.email || null,
      status: "active"
    }).returning({ id: partners.id });
    return { id: result[0].id, referralCode };
  }),
  /**
   * Dashboard stats: totals for referrals, earnings, conversions.
   */
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable"
      });
    const partner = await db.select().from(partners).where(eq4(partners.userId, ctx.user.id)).limit(1);
    if (partner.length === 0) return null;
    const p = partner[0];
    const referralStats = await db.select({
      total: sql3`COUNT(*)`,
      pending: sql3`SUM(CASE WHEN ${referrals.status} = 'pending' THEN 1 ELSE 0 END)`,
      signedUp: sql3`SUM(CASE WHEN ${referrals.status} = 'signed_up' THEN 1 ELSE 0 END)`,
      subscribed: sql3`SUM(CASE WHEN ${referrals.status} = 'subscribed' THEN 1 ELSE 0 END)`,
      churned: sql3`SUM(CASE WHEN ${referrals.status} = 'churned' THEN 1 ELSE 0 END)`,
      totalCommission: sql3`COALESCE(SUM(${referrals.commissionEarned}), 0)`,
      totalMonthlyValue: sql3`COALESCE(SUM(CASE WHEN ${referrals.status} = 'subscribed' THEN ${referrals.monthlyValue} ELSE 0 END), 0)`
    }).from(referrals).where(eq4(referrals.partnerId, p.id));
    const stats = referralStats[0];
    return {
      partner: p,
      stats: {
        totalReferrals: stats?.total || 0,
        pending: stats?.pending || 0,
        signedUp: stats?.signedUp || 0,
        activeSubscriptions: stats?.subscribed || 0,
        churned: stats?.churned || 0,
        totalEarnings: parseFloat(p.totalEarnings?.toString() || "0"),
        pendingEarnings: parseFloat(p.pendingEarnings?.toString() || "0"),
        recurringMonthly: parseFloat(stats?.totalMonthlyValue || "0"),
        conversionRate: (stats?.total || 0) > 0 ? Math.round((stats?.subscribed || 0) / (stats?.total || 1) * 100) : 0
      }
    };
  }),
  /**
   * List all referrals for the current partner.
   */
  listReferrals: protectedProcedure.input(
    z8.object({
      status: z8.enum(["all", "pending", "signed_up", "subscribed", "churned"]).default("all"),
      limit: z8.number().min(1).max(100).default(50),
      offset: z8.number().min(0).default(0)
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return { referrals: [], total: 0 };
    const partner = await db.select().from(partners).where(eq4(partners.userId, ctx.user.id)).limit(1);
    if (partner.length === 0) return { referrals: [], total: 0 };
    const conditions = [eq4(referrals.partnerId, partner[0].id)];
    const statusFilter = input?.status || "all";
    if (statusFilter !== "all") {
      conditions.push(eq4(referrals.status, statusFilter));
    }
    const results = await db.select().from(referrals).where(and3(...conditions)).orderBy(desc2(referrals.createdAt)).limit(input?.limit || 50).offset(input?.offset || 0);
    const countResult = await db.select({ count: sql3`COUNT(*)` }).from(referrals).where(and3(...conditions));
    return {
      referrals: results,
      total: countResult[0]?.count || 0
    };
  }),
  /**
   * Get earnings breakdown.
   */
  getEarnings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const partner = await db.select().from(partners).where(eq4(partners.userId, ctx.user.id)).limit(1);
    if (partner.length === 0) return null;
    const p = partner[0];
    const monthlyEarnings = await db.select({
      month: sql3`TO_CHAR(${referrals.createdAt}, 'YYYY-MM')`,
      earned: sql3`COALESCE(SUM(${referrals.commissionEarned}), 0)`,
      count: sql3`COUNT(*)`
    }).from(referrals).where(eq4(referrals.partnerId, p.id)).groupBy(sql3`TO_CHAR(${referrals.createdAt}, 'YYYY-MM')`).orderBy(sql3`TO_CHAR(${referrals.createdAt}, 'YYYY-MM')`);
    const byTier = await db.select({
      tier: referrals.subscriptionTier,
      earned: sql3`COALESCE(SUM(${referrals.commissionEarned}), 0)`,
      count: sql3`COUNT(*)`
    }).from(referrals).where(
      and3(eq4(referrals.partnerId, p.id), eq4(referrals.status, "subscribed"))
    ).groupBy(referrals.subscriptionTier);
    return {
      totalEarnings: parseFloat(p.totalEarnings?.toString() || "0"),
      pendingEarnings: parseFloat(p.pendingEarnings?.toString() || "0"),
      commissionRate: parseFloat(p.commissionRate?.toString() || "0.20"),
      monthlyEarnings,
      byTier
    };
  }),
  /**
   * Get the partner's referral network (shops they brought in).
   */
  getMyNetwork: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { network: [], totalMRR: 0 };
    const partner = await db.select().from(partners).where(eq4(partners.userId, ctx.user.id)).limit(1);
    if (partner.length === 0) return { network: [], totalMRR: 0 };
    const network = await db.select({
      referralId: referrals.id,
      referredName: referrals.referredName,
      referredEmail: referrals.referredEmail,
      status: referrals.status,
      subscriptionTier: referrals.subscriptionTier,
      monthlyValue: referrals.monthlyValue,
      commissionEarned: referrals.commissionEarned,
      convertedAt: referrals.convertedAt,
      createdAt: referrals.createdAt
    }).from(referrals).where(eq4(referrals.partnerId, partner[0].id)).orderBy(desc2(referrals.createdAt));
    const totalMRR = network.filter((n) => n.status === "subscribed").reduce(
      (sum, n) => sum + parseFloat(n.monthlyValue?.toString() || "0"),
      0
    );
    return { network, totalMRR };
  }),
  /**
   * Request a payout of pending earnings.
   */
  requestPayout: protectedProcedure.input(
    z8.object({
      amount: z8.number().min(50, "Minimum payout is $50")
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable"
      });
    const partner = await db.select().from(partners).where(eq4(partners.userId, ctx.user.id)).limit(1);
    if (partner.length === 0) {
      throw new TRPCError7({
        code: "NOT_FOUND",
        message: "Partner profile not found"
      });
    }
    const p = partner[0];
    const pending = parseFloat(p.pendingEarnings?.toString() || "0");
    if (input.amount > pending) {
      throw new TRPCError7({
        code: "BAD_REQUEST",
        message: `Requested $${input.amount} but only $${pending.toFixed(2)} available`
      });
    }
    const result = await db.insert(partnerPayouts).values({
      partnerId: p.id,
      amount: input.amount.toFixed(2),
      payoutMethod: p.payoutMethod || "stripe",
      payoutEmail: p.payoutEmail || null,
      status: "pending"
    }).returning({ id: partnerPayouts.id });
    await db.update(partners).set({
      pendingEarnings: sql3`${partners.pendingEarnings} - ${input.amount.toFixed(2)}`
    }).where(eq4(partners.id, p.id));
    return { payoutId: result[0].id, amount: input.amount };
  }),
  /**
   * Get payout history.
   */
  getMyPayouts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    const partner = await db.select().from(partners).where(eq4(partners.userId, ctx.user.id)).limit(1);
    if (partner.length === 0) return [];
    return db.select().from(partnerPayouts).where(eq4(partnerPayouts.partnerId, partner[0].id)).orderBy(desc2(partnerPayouts.requestedAt));
  }),
  /**
   * Update partner settings (payout method, notifications, profile).
   */
  updateSettings: protectedProcedure.input(
    z8.object({
      payoutMethod: z8.enum(["stripe", "paypal", "bank_transfer"]).optional(),
      payoutEmail: z8.string().email().optional(),
      companyName: z8.string().max(255).optional(),
      website: z8.string().max(512).optional(),
      notifyReferrals: z8.boolean().optional(),
      notifyPayouts: z8.boolean().optional(),
      notifyNewsletter: z8.boolean().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable"
      });
    const partner = await db.select().from(partners).where(eq4(partners.userId, ctx.user.id)).limit(1);
    if (partner.length === 0) {
      throw new TRPCError7({
        code: "NOT_FOUND",
        message: "Partner profile not found"
      });
    }
    const updateData = {};
    if (input.payoutMethod !== void 0)
      updateData.payoutMethod = input.payoutMethod;
    if (input.payoutEmail !== void 0)
      updateData.payoutEmail = input.payoutEmail;
    if (input.companyName !== void 0)
      updateData.companyName = input.companyName;
    if (input.website !== void 0) updateData.website = input.website;
    if (input.notifyReferrals !== void 0)
      updateData.notifyReferrals = input.notifyReferrals;
    if (input.notifyPayouts !== void 0)
      updateData.notifyPayouts = input.notifyPayouts;
    if (input.notifyNewsletter !== void 0)
      updateData.notifyNewsletter = input.notifyNewsletter;
    if (Object.keys(updateData).length > 0) {
      await db.update(partners).set(updateData).where(eq4(partners.id, partner[0].id));
    }
    return { success: true };
  })
});

// server/analyticsRouter.ts
import { z as z9 } from "zod";
import { eq as eq5, and as and4, gte as gte3, sql as sql4, count as count2, desc as desc3 } from "drizzle-orm";
var TWILIO_RATE_PER_MIN = 0.014;
var ELEVENLABS_RATE_PER_CHAR = 11e-5;
var AVG_CHARS_PER_MINUTE = 600;
var analyticsRouter = router({
  /**
   * Get cost summary across all of the user's shops.
   * Covers the current calendar month by default.
   */
  getCostSummary: protectedProcedure.input(
    z9.object({
      startDate: z9.string().optional(),
      endDate: z9.string().optional()
    }).optional()
  ).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) return null;
    const now = /* @__PURE__ */ new Date();
    const monthStart = input?.startDate ? new Date(input.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = input?.endDate ? new Date(input.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const userShops = await db.select({ id: shops.id }).from(shops).where(eq5(shops.ownerId, ctx.user.id));
    const shopIds = userShops.map((s) => s.id);
    if (shopIds.length === 0) {
      return {
        callCount: 0,
        totalMinutes: 0,
        twilioCost: 0,
        elevenLabsCost: 0,
        totalCost: 0,
        costPerCall: 0,
        revenue: 0,
        grossMargin: 0,
        dailyCalls: [],
        recentCalls: []
      };
    }
    const shopIdList = shopIds.join(",");
    const callStats = await db.select({
      callCount: count2(),
      totalSeconds: sql4`COALESCE(SUM(${callLogs.duration}), 0)`
    }).from(callLogs).where(
      and4(
        sql4`${callLogs.shopId} IN (${sql4.raw(shopIdList)})`,
        gte3(callLogs.createdAt, monthStart)
      )
    );
    const stats = callStats[0];
    const callCount = stats?.callCount || 0;
    const totalSeconds = stats?.totalSeconds || 0;
    const totalMinutes = Math.ceil(totalSeconds / 60);
    const twilioCost = totalMinutes * TWILIO_RATE_PER_MIN;
    const elevenLabsCost = totalMinutes * AVG_CHARS_PER_MINUTE * ELEVENLABS_RATE_PER_CHAR;
    const totalCost = twilioCost + elevenLabsCost;
    const costPerCall = callCount > 0 ? totalCost / callCount : 0;
    const TIER_PRICES = {
      starter: 199,
      pro: 349,
      elite: 599
    };
    const activeSubs = await db.select({ tier: subscriptions.tier }).from(subscriptions).where(
      and4(
        sql4`${subscriptions.shopId} IN (${sql4.raw(shopIdList)})`,
        eq5(subscriptions.status, "active")
      )
    );
    const revenue = activeSubs.reduce(
      (sum, s) => sum + (TIER_PRICES[s.tier] || 0),
      0
    );
    const grossMargin = revenue > 0 ? (revenue - totalCost) / revenue * 100 : 0;
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailyCalls = await db.select({
      date: sql4`DATE(${callLogs.createdAt})`,
      count: count2()
    }).from(callLogs).where(
      and4(
        sql4`${callLogs.shopId} IN (${sql4.raw(shopIdList)})`,
        gte3(callLogs.createdAt, thirtyDaysAgo)
      )
    ).groupBy(sql4`DATE(${callLogs.createdAt})`).orderBy(sql4`DATE(${callLogs.createdAt})`);
    const recentCalls = await db.select({
      id: callLogs.id,
      callerPhone: callLogs.callerPhone,
      duration: callLogs.duration,
      status: callLogs.status,
      createdAt: callLogs.createdAt
    }).from(callLogs).where(sql4`${callLogs.shopId} IN (${sql4.raw(shopIdList)})`).orderBy(desc3(callLogs.createdAt)).limit(10);
    return {
      callCount,
      totalMinutes,
      twilioCost: Math.round(twilioCost * 100) / 100,
      elevenLabsCost: Math.round(elevenLabsCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      costPerCall: Math.round(costPerCall * 100) / 100,
      revenue,
      grossMargin: Math.round(grossMargin * 10) / 10,
      dailyCalls,
      recentCalls
    };
  })
});

// server/contactRouter.ts
import { z as z10 } from "zod";

// server/services/emailService.ts
import { Resend as Resend2 } from "resend";
var resend2 = process.env.RESEND_API_KEY ? new Resend2(process.env.RESEND_API_KEY) : null;
async function sendContactNotification(data) {
  const htmlBody = `
    <h2>New Contact Form Submission</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Name</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.name)}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Email</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.email)}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Phone</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.phone || "Not provided")}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd"><strong>Message</strong></td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(data.message)}</td></tr>
    </table>
    <p style="color:#666;font-size:12px">Submitted at ${(/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>
  `;
  if (!resend2) {
    console.log("[EmailService] RESEND_API_KEY not set \u2014 logging email instead:");
    console.log(`  To: hello@baylio.io`);
    console.log(`  Subject: New Contact Form Submission \u2014 ${data.name}`);
    console.log(`  From: ${data.email} | Phone: ${data.phone || "N/A"}`);
    return;
  }
  try {
    const result = await resend2.emails.send({
      from: "Baylio Contact Form <hello@baylio.io>",
      to: ["hello@baylio.io"],
      replyTo: data.email,
      subject: `New Contact Form Submission \u2014 ${data.name}`,
      html: htmlBody,
      text: `New contact form submission:

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || "Not provided"}
Message: ${data.message}`
    });
    console.log("[EmailService] Contact notification sent via Resend:", result.data?.id);
  } catch (err) {
    console.error("[EmailService] Failed to send via Resend:", err);
  }
}
function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// server/contactRouter.ts
var contactRouter = router({
  submit: publicProcedure.input(
    z10.object({
      name: z10.string().min(1).max(255),
      email: z10.string().email().max(320),
      phone: z10.string().max(32).optional().default(""),
      message: z10.string().min(1).max(5e3)
    })
  ).mutation(async ({ input }) => {
    const id = await createContactSubmission({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      message: input.message
    });
    sendContactNotification({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      message: input.message
    }).catch((err) => {
      console.error("[Contact] Email notification failed:", err);
    });
    notifyOwner({
      title: `New contact from ${input.name}`,
      content: `Email: ${input.email}
Phone: ${input.phone || "N/A"}

${input.message}`
    }).catch((err) => {
      console.error("[Contact] Owner notification failed:", err);
    });
    return { success: true, id: id ?? null };
  })
});

// server/integrationRouter.ts
import { z as z11 } from "zod";
import { TRPCError as TRPCError8 } from "@trpc/server";
import { eq as eq6, and as and5, desc as desc4 } from "drizzle-orm";
var integrationRouter = router({
  /** List all active integrations for a shop */
  listConnected: protectedProcedure.input(z11.object({ shopId: z11.number() })).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) return [];
    const db = await getDb();
    if (!db) return [];
    return db.select().from(shopIntegrations).where(
      and5(
        eq6(shopIntegrations.shopId, input.shopId),
        eq6(shopIntegrations.isActive, true)
      )
    );
  }),
  /** Disconnect an integration */
  disconnect: protectedProcedure.input(z11.object({ integrationId: z11.number(), shopId: z11.number() })).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError8({ code: "NOT_FOUND", message: "Shop not found" });
    }
    const db = await getDb();
    if (!db)
      throw new TRPCError8({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable"
      });
    await db.update(shopIntegrations).set({ isActive: false }).where(eq6(shopIntegrations.id, input.integrationId));
    return { success: true };
  }),
  /** Save integration settings (API keys, calendar ID, sheet ID, etc.) */
  saveSettings: protectedProcedure.input(
    z11.object({
      shopId: z11.number(),
      provider: z11.enum([
        "google_calendar",
        "google_sheets",
        "shopmonkey",
        "tekmetric",
        "hubspot"
      ]),
      settings: z11.record(z11.string(), z11.unknown()).optional(),
      accessToken: z11.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) {
      throw new TRPCError8({ code: "NOT_FOUND", message: "Shop not found" });
    }
    const db = await getDb();
    if (!db)
      throw new TRPCError8({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable"
      });
    const existing = await db.select({ id: shopIntegrations.id }).from(shopIntegrations).where(
      and5(
        eq6(shopIntegrations.shopId, input.shopId),
        eq6(shopIntegrations.provider, input.provider)
      )
    ).limit(1);
    if (existing.length > 0) {
      await db.update(shopIntegrations).set({
        settings: input.settings || {},
        ...input.accessToken ? { accessToken: input.accessToken } : {},
        isActive: true
      }).where(eq6(shopIntegrations.id, existing[0].id));
    } else {
      await db.insert(shopIntegrations).values({
        shopId: input.shopId,
        provider: input.provider,
        settings: input.settings || {},
        accessToken: input.accessToken || null,
        isActive: true
      });
    }
    return { success: true };
  }),
  /** Get recent sync logs for a shop */
  getSyncLogs: protectedProcedure.input(
    z11.object({
      shopId: z11.number(),
      limit: z11.number().min(1).max(100).default(20)
    })
  ).query(async ({ ctx, input }) => {
    const shop = await getShopById(input.shopId);
    if (!shop || shop.ownerId !== ctx.user.id) return [];
    const db = await getDb();
    if (!db) return [];
    return db.select().from(integrationSyncLogs).where(eq6(integrationSyncLogs.shopId, input.shopId)).orderBy(desc4(integrationSyncLogs.createdAt)).limit(input.limit);
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  shop: shopRouter,
  calls: callRouter,
  notification: notificationRouter,
  subscription: subscriptionRouter,
  organization: organizationRouter,
  stripe: stripeRouter,
  partner: partnerRouter,
  analytics: analyticsRouter,
  contact: contactRouter,
  integration: integrationRouter
});

// server/lib/supabase.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
var serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
var supabaseAdmin = supabaseUrl && serviceRoleKey ? createClient2(supabaseUrl, serviceRoleKey) : null;

// server/_core/context.ts
import { eq as eq7 } from "drizzle-orm";
async function createContext(opts) {
  let user = null;
  const authHeader = opts.req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (bearerToken && supabaseAdmin) {
    try {
      const { data: { user: supaUser }, error } = await supabaseAdmin.auth.getUser(bearerToken);
      if (supaUser && !error) {
        const dbConn = await getDb();
        if (dbConn) {
          const result = await dbConn.select().from(users).where(eq7(users.supabaseId, supaUser.id)).limit(1);
          if (result[0]) {
            user = result[0];
          } else {
            const inserted = await dbConn.insert(users).values({
              supabaseId: supaUser.id,
              email: supaUser.email ?? null,
              name: supaUser.user_metadata?.full_name ?? supaUser.email?.split("@")[0] ?? "User",
              role: "user"
            }).returning();
            user = inserted[0] ?? null;
          }
        }
      }
    } catch (e) {
      console.error("[Auth] Supabase token verification failed:", e);
    }
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/services/twilioWebhooks.ts
import { Router as Router2 } from "express";

// server/services/contextCache.ts
var DEFAULT_TTL_MS = 5 * 60 * 1e3;
var MAX_CACHE_SIZE = 500;
var ContextCache = class {
  /** Shop ID → compiled context */
  shopContexts = /* @__PURE__ */ new Map();
  /** Twilio phone number → shop ID (for webhook routing) */
  phoneToShopId = /* @__PURE__ */ new Map();
  /** Compiled system prompts (expensive to regenerate) */
  compiledPrompts = /* @__PURE__ */ new Map();
  stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  ttlMs;
  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }
  // ─── Shop Context Cache ─────────────────────────────────────────────
  /**
   * Get cached shop context by shop ID.
   * Returns null if not cached or expired.
   */
  getShopContext(shopId) {
    const entry = this.shopContexts.get(shopId);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.shopContexts.delete(shopId);
        this.stats.evictions++;
      }
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.data;
  }
  /**
   * Cache a shop context.
   */
  setShopContext(shopId, context, ttlMs) {
    this.enforceMaxSize(this.shopContexts);
    const now = Date.now();
    this.shopContexts.set(shopId, {
      data: context,
      expiresAt: now + (ttlMs || this.ttlMs),
      createdAt: now
    });
    this.updateSize();
  }
  // ─── Phone Number Routing Cache ─────────────────────────────────────
  /**
   * Get shop ID by Twilio phone number.
   * This is the critical lookup for inbound call routing.
   */
  getShopIdByPhone(phoneNumber) {
    const normalized = this.normalizePhone(phoneNumber);
    const entry = this.phoneToShopId.get(normalized);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.phoneToShopId.delete(normalized);
        this.stats.evictions++;
      }
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.data;
  }
  /**
   * Cache a phone number → shop ID mapping.
   */
  setPhoneToShopId(phoneNumber, shopId, ttlMs) {
    const normalized = this.normalizePhone(phoneNumber);
    const now = Date.now();
    this.phoneToShopId.set(normalized, {
      data: shopId,
      expiresAt: now + (ttlMs || this.ttlMs),
      createdAt: now
    });
  }
  // ─── Compiled Prompt Cache ──────────────────────────────────────────
  /**
   * Get a cached compiled prompt for a shop.
   */
  getCompiledPrompt(shopId) {
    const entry = this.compiledPrompts.get(shopId);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.compiledPrompts.delete(shopId);
        this.stats.evictions++;
      }
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.data;
  }
  /**
   * Cache a compiled prompt.
   */
  setCompiledPrompt(shopId, prompt, ttlMs) {
    this.enforceMaxSize(this.compiledPrompts);
    const now = Date.now();
    this.compiledPrompts.set(shopId, {
      data: prompt,
      expiresAt: now + (ttlMs || this.ttlMs),
      createdAt: now
    });
  }
  // ─── Invalidation ──────────────────────────────────────────────────
  /**
   * Invalidate all cached data for a shop.
   * Call this when shop config, agent config, or service catalog changes.
   */
  invalidateShop(shopId) {
    this.shopContexts.delete(shopId);
    this.compiledPrompts.delete(shopId);
    Array.from(this.phoneToShopId).forEach(([phone, entry]) => {
      if (entry.data === shopId) {
        this.phoneToShopId.delete(phone);
      }
    });
    this.updateSize();
  }
  /**
   * Invalidate a specific phone number mapping.
   */
  invalidatePhone(phoneNumber) {
    this.phoneToShopId.delete(this.normalizePhone(phoneNumber));
  }
  /**
   * Clear all caches.
   */
  clear() {
    this.shopContexts.clear();
    this.phoneToShopId.clear();
    this.compiledPrompts.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }
  // ─── Stats & Monitoring ─────────────────────────────────────────────
  /**
   * Get cache statistics for monitoring.
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(1) + "%" : "N/A";
    return { ...this.stats, hitRate };
  }
  // ─── Internal Helpers ───────────────────────────────────────────────
  normalizePhone(phone) {
    return phone.replace(/[^\d+]/g, "");
  }
  enforceMaxSize(cache) {
    if (cache.size >= MAX_CACHE_SIZE) {
      let oldestKey = null;
      let oldestTime = Infinity;
      Array.from(cache).forEach(([key, entry]) => {
        if (entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt;
          oldestKey = key;
        }
      });
      if (oldestKey !== null) {
        cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
  }
  updateSize() {
    this.stats.size = this.shopContexts.size + this.phoneToShopId.size + this.compiledPrompts.size;
  }
};
var contextCache = new ContextCache();

// server/services/postCallPipeline.ts
import { eq as eq13, and as and11, sql as sql5 } from "drizzle-orm";

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
function resolveConfig() {
  if (process.env.OPENAI_API_KEY) {
    return {
      apiUrl: "https://api.openai.com/v1/chat/completions",
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.LLM_MODEL || "gpt-4o"
    };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return {
      apiUrl: "https://openrouter.ai/api/v1/chat/completions",
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.LLM_MODEL || "google/gemini-2.5-flash"
    };
  }
  throw new Error(
    "No LLM API key configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY."
  );
}
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
async function invokeLLM(params) {
  const config = resolveConfig();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const maxTokens = params.maxTokens || params.max_tokens || 32768;
  const payload = {
    model: config.model,
    messages: messages.map(normalizeMessage),
    max_tokens: maxTokens
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/services/calendarService.ts
import { google as google2 } from "googleapis";

// server/services/googleAuth.ts
import { Router } from "express";
import { google } from "googleapis";
import { eq as eq8, and as and6 } from "drizzle-orm";
var SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets"
];
function getOAuth2Client(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}
var googleAuthRouter = Router();
googleAuthRouter.get("/connect", (req, res) => {
  const { shopId, origin } = req.query;
  if (!shopId || !origin) {
    res.status(400).json({ error: "shopId and origin are required" });
    return;
  }
  const redirectUri = `${origin}/api/integrations/google/callback`;
  const oauth2Client = getOAuth2Client(redirectUri);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state: JSON.stringify({ shopId, origin })
  });
  res.redirect(authUrl);
});
googleAuthRouter.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      res.status(400).send("Missing code or state");
      return;
    }
    const { shopId, origin } = JSON.parse(state);
    const redirectUri = `${origin}/api/integrations/google/callback`;
    const oauth2Client = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const db = await getDb();
    if (!db) {
      res.status(500).send("Database unavailable");
      return;
    }
    for (const provider of ["google_calendar", "google_sheets"]) {
      const existing = await db.select({ id: shopIntegrations.id }).from(shopIntegrations).where(
        and6(
          eq8(shopIntegrations.shopId, parseInt(shopId)),
          eq8(shopIntegrations.provider, provider)
        )
      ).limit(1);
      const tokenData = {
        accessToken: tokens.access_token || null,
        refreshToken: tokens.refresh_token || null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        externalAccountId: userInfo.data.email || null,
        isActive: true
      };
      if (existing.length > 0) {
        await db.update(shopIntegrations).set(tokenData).where(eq8(shopIntegrations.id, existing[0].id));
      } else {
        await db.insert(shopIntegrations).values({
          shopId: parseInt(shopId),
          provider,
          ...tokenData
        });
      }
    }
    res.redirect(`${origin}/shops/${shopId}/integrations?google=connected`);
  } catch (error) {
    console.error("[GOOGLE-AUTH] OAuth callback error:", error);
    res.status(500).send("Failed to complete Google authentication");
  }
});
async function getGoogleClient(shopId, provider) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(shopIntegrations).where(
    and6(
      eq8(shopIntegrations.shopId, shopId),
      eq8(shopIntegrations.provider, provider),
      eq8(shopIntegrations.isActive, true)
    )
  ).limit(1);
  if (results.length === 0) return null;
  const integration = results[0];
  if (!integration.accessToken) return null;
  const oauth2Client = getOAuth2Client("");
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    expiry_date: integration.tokenExpiresAt?.getTime()
  });
  if (integration.tokenExpiresAt && integration.tokenExpiresAt < /* @__PURE__ */ new Date()) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      await db.update(shopIntegrations).set({
        accessToken: credentials.access_token || integration.accessToken,
        tokenExpiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null
      }).where(eq8(shopIntegrations.id, integration.id));
      oauth2Client.setCredentials(credentials);
    } catch (err) {
      console.error("[GOOGLE-AUTH] Token refresh failed:", err);
      return null;
    }
  }
  return oauth2Client;
}

// server/services/calendarService.ts
import { eq as eq9, and as and7 } from "drizzle-orm";
async function createAppointment(shopId, params) {
  try {
    const auth = await getGoogleClient(shopId, "google_calendar");
    if (!auth) {
      console.log("[CALENDAR] No Google Calendar connected for shop", shopId);
      return { success: false, error: "Google Calendar not connected" };
    }
    const db = await getDb();
    if (!db) return { success: false, error: "Database unavailable" };
    const integration = await db.select().from(shopIntegrations).where(
      and7(
        eq9(shopIntegrations.shopId, shopId),
        eq9(shopIntegrations.provider, "google_calendar")
      )
    ).limit(1);
    const calendarId = integration[0]?.settings?.calendarId || "primary";
    const calendar = google2.calendar({ version: "v3", auth });
    const startDate = new Date(params.dateTime);
    const endDate = new Date(
      startDate.getTime() + (params.duration || 60) * 60 * 1e3
    );
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `[Baylio] ${params.service} \u2014 ${params.customerName}`,
        description: [
          `Customer: ${params.customerName}`,
          `Phone: ${params.customerPhone}`,
          `Service: ${params.service}`,
          params.notes ? `Notes: ${params.notes}` : "",
          "",
          "Booked by Baylio AI Call Assistant"
        ].filter(Boolean).join("\n"),
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() }
      }
    });
    await db.insert(integrationSyncLogs).values({
      shopId,
      provider: "google_calendar",
      action: "create_appointment",
      status: "success",
      metadata: { eventId: event.data.id, customerName: params.customerName }
    });
    return { success: true, eventId: event.data.id || void 0 };
  } catch (error) {
    console.error("[CALENDAR] Error creating appointment:", error.message);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(integrationSyncLogs).values({
          shopId,
          provider: "google_calendar",
          action: "create_appointment",
          status: "failed",
          errorMessage: error.message
        });
      }
    } catch {
    }
    return { success: false, error: error.message };
  }
}

// server/services/sheetsService.ts
import { google as google3 } from "googleapis";
import { eq as eq10, and as and8 } from "drizzle-orm";
var HEADER_ROW = [
  "Date",
  "Time",
  "Caller",
  "Phone",
  "Duration (s)",
  "Service Requested",
  "Appointment Booked",
  "Upsell Offered",
  "Upsell Accepted",
  "Sentiment",
  "Revenue Estimate",
  "Summary"
];
async function syncCallToSheet(shopId, callLog) {
  try {
    const auth = await getGoogleClient(shopId, "google_sheets");
    if (!auth) return { success: false, error: "Google Sheets not connected" };
    const db = await getDb();
    if (!db) return { success: false, error: "Database unavailable" };
    const integration = await db.select().from(shopIntegrations).where(
      and8(
        eq10(shopIntegrations.shopId, shopId),
        eq10(shopIntegrations.provider, "google_sheets")
      )
    ).limit(1);
    const sheetId = integration[0]?.settings?.sheetId;
    if (!sheetId) return { success: false, error: "No sheet configured" };
    const sheets = google3.sheets({ version: "v4", auth });
    const date = callLog.createdAt || /* @__PURE__ */ new Date();
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Sheet1!A1:L1"
    });
    if (!existing.data.values || existing.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "Sheet1!A1:L1",
        valueInputOption: "RAW",
        requestBody: { values: [HEADER_ROW] }
      });
    }
    const row = [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      callLog.callerName || "Unknown",
      callLog.callerPhone || "",
      callLog.duration?.toString() || "0",
      callLog.serviceRequested || "",
      callLog.appointmentBooked ? "Yes" : "No",
      callLog.upsellAttempted ? "Yes" : "No",
      callLog.upsellAccepted ? "Yes" : "No",
      callLog.sentimentScore || "",
      callLog.estimatedRevenue ? `$${callLog.estimatedRevenue}` : "",
      callLog.summary || ""
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Sheet1!A:L",
      valueInputOption: "RAW",
      requestBody: { values: [row] }
    });
    await db.insert(integrationSyncLogs).values({
      shopId,
      provider: "google_sheets",
      action: "sync_call",
      status: "success"
    });
    return { success: true };
  } catch (error) {
    console.error("[SHEETS] Error syncing call:", error.message);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(integrationSyncLogs).values({
          shopId,
          provider: "google_sheets",
          action: "sync_call",
          status: "failed",
          errorMessage: error.message
        });
      }
    } catch {
    }
    return { success: false, error: error.message };
  }
}

// server/services/hubspotService.ts
import { Client } from "@hubspot/api-client";
import { eq as eq11, and as and9 } from "drizzle-orm";
function getHubspotClient(apiKey) {
  return new Client({ accessToken: apiKey });
}
async function getShopHubspotKey(shopId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(shopIntegrations).where(
    and9(
      eq11(shopIntegrations.shopId, shopId),
      eq11(shopIntegrations.provider, "hubspot"),
      eq11(shopIntegrations.isActive, true)
    )
  ).limit(1);
  if (result.length > 0 && result[0].accessToken) {
    return result[0].accessToken;
  }
  return process.env.HUBSPOT_API_KEY || null;
}
async function syncCallerToHubspot(shopId, caller) {
  try {
    const apiKey = await getShopHubspotKey(shopId);
    if (!apiKey) return { success: false, error: "HubSpot not connected" };
    const client = getHubspotClient(apiKey);
    let contactId;
    try {
      const searchResult = await client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "phone",
                operator: "EQ",
                value: caller.phone
              }
            ]
          }
        ],
        properties: ["phone", "firstname", "lastname", "email"],
        limit: 1
      });
      if (searchResult.results.length > 0) {
        contactId = searchResult.results[0].id;
        await client.crm.contacts.basicApi.update(contactId, {
          properties: {
            ...caller.name ? {
              firstname: caller.name.split(" ")[0],
              lastname: caller.name.split(" ").slice(1).join(" ") || ""
            } : {},
            hs_lead_status: "OPEN"
          }
        });
      }
    } catch {
    }
    if (!contactId) {
      try {
        const nameParts = (caller.name || "Unknown").split(" ");
        const created = await client.crm.contacts.basicApi.create({
          properties: {
            phone: caller.phone,
            firstname: nameParts[0],
            lastname: nameParts.slice(1).join(" ") || "",
            ...caller.email ? { email: caller.email } : {},
            hs_lead_status: "NEW",
            lifecyclestage: "lead"
          }
        });
        contactId = created.id;
      } catch (err) {
        console.error("[HUBSPOT] Error creating contact:", err.message);
        return { success: false, error: err.message };
      }
    }
    if (caller.callSummary && contactId) {
      try {
        await client.crm.objects.notes.basicApi.create({
          properties: {
            hs_note_body: `Baylio AI Call Summary:

${caller.callSummary}

Service: ${caller.service || "N/A"}
Duration: ${caller.duration || 0}s`,
            hs_timestamp: (/* @__PURE__ */ new Date()).toISOString()
          },
          associations: [
            {
              to: { id: contactId },
              types: [
                {
                  associationCategory: "HUBSPOT_DEFINED",
                  associationTypeId: 202
                }
              ]
            }
          ]
        });
      } catch (err) {
        console.error("[HUBSPOT] Error creating note:", err.message);
      }
    }
    const db = await getDb();
    if (db) {
      await db.insert(integrationSyncLogs).values({
        shopId,
        provider: "hubspot",
        action: contactId ? "sync_contact" : "create_contact",
        status: "success",
        metadata: { contactId }
      });
    }
    return { success: true, contactId };
  } catch (error) {
    console.error("[HUBSPOT] Error syncing caller:", error.message);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(integrationSyncLogs).values({
          shopId,
          provider: "hubspot",
          action: "sync_contact",
          status: "failed",
          errorMessage: error.message
        });
      }
    } catch {
    }
    return { success: false, error: error.message };
  }
}

// server/services/shopmonkeyService.ts
import { eq as eq12, and as and10 } from "drizzle-orm";
async function getShopmonkeyKeys(shopId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(shopIntegrations).where(
    and10(
      eq12(shopIntegrations.shopId, shopId),
      eq12(shopIntegrations.provider, "shopmonkey"),
      eq12(shopIntegrations.isActive, true)
    )
  ).limit(1);
  if (result.length === 0) return null;
  const settings = result[0].settings;
  if (!settings?.shopmonkeyPublicKey || !settings?.shopmonkeyPrivateKey)
    return null;
  return {
    publicKey: settings.shopmonkeyPublicKey,
    privateKey: settings.shopmonkeyPrivateKey
  };
}
async function shopmonkeyFetch(path, keys, options = {}) {
  const response = await fetch(`https://api.shopmonkey.cloud${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${keys.privateKey}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    const text2 = await response.text();
    throw new Error(`Shopmonkey API error (${response.status}): ${text2}`);
  }
  return response.json();
}
async function createWorkOrder(shopId, params) {
  try {
    const keys = await getShopmonkeyKeys(shopId);
    if (!keys) return { success: false, error: "Shopmonkey not connected" };
    let customerId;
    try {
      const searchResult = await shopmonkeyFetch(
        `/v3/customer?phone=${encodeURIComponent(params.customerPhone)}`,
        keys
      );
      if (searchResult.data?.length > 0) {
        customerId = searchResult.data[0].id;
      }
    } catch {
    }
    if (!customerId) {
      const nameParts = params.customerName.split(" ");
      const customer = await shopmonkeyFetch("/v3/customer", keys, {
        method: "POST",
        body: JSON.stringify({
          firstName: nameParts[0],
          lastName: nameParts.slice(1).join(" ") || "",
          phone: [{ number: params.customerPhone, type: "mobile" }]
        })
      });
      customerId = customer.data?.id;
    }
    const order = await shopmonkeyFetch("/v3/order", keys, {
      method: "POST",
      body: JSON.stringify({
        customerId,
        note: `Service: ${params.service}
${params.notes || ""}

Booked via Baylio AI`,
        ...params.appointmentDate ? { appointmentDate: params.appointmentDate } : {}
      })
    });
    const db = await getDb();
    if (db) {
      await db.insert(integrationSyncLogs).values({
        shopId,
        provider: "shopmonkey",
        action: "create_work_order",
        status: "success",
        metadata: { orderId: order.data?.id, customerId }
      });
    }
    return { success: true, orderId: order.data?.id };
  } catch (error) {
    console.error("[SHOPMONKEY] Error creating work order:", error.message);
    try {
      const db = await getDb();
      if (db) {
        await db.insert(integrationSyncLogs).values({
          shopId,
          provider: "shopmonkey",
          action: "create_work_order",
          status: "failed",
          errorMessage: error.message
        });
      }
    } catch {
    }
    return { success: false, error: error.message };
  }
}

// server/services/smsService.ts
async function sendSMS(payload) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const defaultFrom = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken) {
    console.warn("[SMS] Twilio credentials not configured. SMS not sent.");
    return { success: false, error: "Twilio credentials not configured" };
  }
  const from = payload.from || defaultFrom;
  if (!from) {
    return { success: false, error: "No 'from' phone number configured" };
  }
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        To: payload.to,
        From: from,
        Body: payload.body
      })
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error("[SMS] Twilio API error:", errorData);
      return { success: false, error: `Twilio API error: ${response.status}` };
    }
    const data = await response.json();
    return { success: true, sid: data.sid };
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return { success: false, error: String(error) };
  }
}

// server/services/postCallPipeline.ts
async function analyzeTranscription(transcription, shopName, serviceCatalog) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a call analysis engine for ${shopName}, an auto repair shop. Analyze the following call transcription and extract structured data. The shop offers these services: ${serviceCatalog.join(", ")}.`
        },
        {
          role: "user",
          content: `Analyze this call transcription:

${transcription}`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "call_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              customerIntent: {
                type: "string",
                description: "Primary reason for the call (e.g., 'brake repair inquiry', 'oil change appointment', 'pricing question')"
              },
              serviceRequested: {
                type: "string",
                description: "Specific service the customer is requesting, must match catalog if possible"
              },
              sentimentScore: {
                type: "number",
                description: "Customer sentiment from 0.0 (very negative) to 1.0 (very positive)"
              },
              qualityScore: {
                type: "number",
                description: "Call handling quality from 0.0 (poor) to 1.0 (excellent)"
              },
              qaFlags: {
                type: "array",
                items: { type: "string" },
                description: "Quality assurance flags (e.g., 'customer_escalation_needed', 'pricing_discussed', 'competitor_mentioned', 'safety_concern')"
              },
              summary: {
                type: "string",
                description: "2-3 sentence summary of the call"
              },
              appointmentBooked: {
                type: "boolean",
                description: "Whether an appointment was successfully booked"
              },
              upsellAttempted: {
                type: "boolean",
                description: "Whether an additional service was suggested"
              },
              upsellAccepted: {
                type: "boolean",
                description: "Whether the customer accepted the upsell"
              },
              estimatedRevenue: {
                type: "number",
                description: "Estimated revenue from this call in dollars (0 if no service booked)"
              }
            },
            required: [
              "customerIntent",
              "serviceRequested",
              "sentimentScore",
              "qualityScore",
              "qaFlags",
              "summary",
              "appointmentBooked",
              "upsellAttempted",
              "upsellAccepted",
              "estimatedRevenue"
            ],
            additionalProperties: false
          }
        }
      }
    });
    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error("No content in LLM response");
    }
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    return JSON.parse(content);
  } catch (error) {
    console.error("[POST-CALL] Error analyzing transcription:", error);
    return {
      customerIntent: "unknown",
      serviceRequested: "unknown",
      sentimentScore: 0.5,
      qualityScore: 0.5,
      qaFlags: ["analysis_failed"],
      summary: "Call analysis failed. Manual review recommended.",
      appointmentBooked: false,
      upsellAttempted: false,
      upsellAccepted: false,
      estimatedRevenue: 0
    };
  }
}
async function processCompletedCall(callLogId) {
  try {
    const db = await getDb();
    if (!db) return;
    const callResults = await db.select().from(callLogs).where(eq13(callLogs.id, callLogId)).limit(1);
    if (callResults.length === 0) return;
    const call = callResults[0];
    if (call.transcription) {
      const shopResults = await db.select().from(shops).where(eq13(shops.id, call.shopId)).limit(1);
      const shop = shopResults[0];
      const catalog = (shop?.serviceCatalog || []).map(
        (s) => s.name
      );
      const analysis = await analyzeTranscription(
        call.transcription,
        shop?.name || "Auto Repair Shop",
        catalog
      );
      await db.update(callLogs).set({
        customerIntent: analysis.customerIntent,
        serviceRequested: analysis.serviceRequested,
        sentimentScore: analysis.sentimentScore.toFixed(2),
        qualityScore: analysis.qualityScore.toFixed(2),
        qaFlags: analysis.qaFlags,
        summary: analysis.summary,
        appointmentBooked: analysis.appointmentBooked,
        upsellAttempted: analysis.upsellAttempted,
        upsellAccepted: analysis.upsellAccepted,
        estimatedRevenue: analysis.estimatedRevenue.toFixed(2)
      }).where(eq13(callLogs.id, callLogId));
      try {
        await runPostCallIntegrations(call.shopId, call, analysis);
      } catch (err) {
        console.error(
          "[POST-CALL] Integration pipeline error (non-fatal):",
          err
        );
      }
    }
    const duration = call.duration || 0;
    const minutesUsed = Math.ceil(duration / 60);
    if (minutesUsed > 0) {
      const subResults = await db.select().from(subscriptions).where(
        and11(
          eq13(subscriptions.shopId, call.shopId),
          eq13(subscriptions.status, "active")
        )
      ).limit(1);
      if (subResults.length > 0) {
        const sub = subResults[0];
        const isOverage = sub.usedMinutes + minutesUsed > sub.includedMinutes;
        const overageMinutes = isOverage ? sub.usedMinutes + minutesUsed - sub.includedMinutes : 0;
        const overageCharge = overageMinutes * parseFloat(sub.overageRate?.toString() || "0.15");
        await db.insert(usageRecords).values({
          subscriptionId: sub.id,
          shopId: call.shopId,
          ownerId: call.ownerId,
          callLogId,
          minutesUsed: minutesUsed.toFixed(2),
          isOverage,
          overageCharge: overageCharge.toFixed(2)
        });
        await db.update(subscriptions).set({
          usedMinutes: sql5`${subscriptions.usedMinutes} + ${minutesUsed}`
        }).where(eq13(subscriptions.id, sub.id));
      }
    }
    if (call.estimatedRevenue && parseFloat(call.estimatedRevenue.toString()) > 200) {
      await db.insert(notifications).values({
        userId: call.ownerId,
        shopId: call.shopId,
        type: "high_value_lead",
        title: "High-Value Lead Detected",
        message: `A caller inquired about services worth an estimated $${call.estimatedRevenue}. Review the call log for details.`,
        metadata: { callLogId, estimatedRevenue: call.estimatedRevenue }
      });
    }
    console.log(`[POST-CALL] Completed processing for call ${callLogId}`);
  } catch (error) {
    console.error(`[POST-CALL] Error processing call ${callLogId}:`, error);
  }
}
async function runPostCallIntegrations(shopId, callLog, analysis) {
  if (analysis.appointmentBooked) {
    try {
      await createAppointment(shopId, {
        customerName: callLog.callerName || "Customer",
        customerPhone: callLog.callerPhone || "",
        service: analysis.serviceRequested,
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1e3).toISOString(),
        // Default: tomorrow (actual date extracted from transcription in production)
        notes: analysis.summary
      });
    } catch (err) {
      console.error("[POST-CALL] Calendar integration error:", err);
    }
  }
  try {
    await syncCallToSheet(shopId, callLog);
  } catch (err) {
    console.error("[POST-CALL] Sheets integration error:", err);
  }
  try {
    await syncCallerToHubspot(shopId, {
      phone: callLog.callerPhone || "",
      name: callLog.callerName || void 0,
      service: analysis.serviceRequested,
      callSummary: analysis.summary,
      duration: callLog.duration,
      recordingUrl: callLog.recordingUrl
    });
  } catch (err) {
    console.error("[POST-CALL] HubSpot integration error:", err);
  }
  if (analysis.appointmentBooked) {
    try {
      await createWorkOrder(shopId, {
        customerName: callLog.callerName || "Customer",
        customerPhone: callLog.callerPhone || "",
        service: analysis.serviceRequested,
        notes: analysis.summary
      });
    } catch (err) {
      console.error("[POST-CALL] Shopmonkey integration error:", err);
    }
  }
  try {
    const db = await getDb();
    if (db && callLog.callerPhone) {
      const profile = await db.select({
        smsOptOut: callerProfiles.smsOptOut,
        doNotSell: callerProfiles.doNotSell
      }).from(callerProfiles).where(eq13(callerProfiles.phone, callLog.callerPhone)).limit(1);
      const optedOut = profile[0]?.smsOptOut || profile[0]?.doNotSell;
      const shopResult = await db.select({
        smsFollowUpEnabled: shops.smsFollowUpEnabled,
        name: shops.name,
        phone: shops.phone
      }).from(shops).where(eq13(shops.id, shopId)).limit(1);
      const shop = shopResult[0];
      if (!optedOut && shop?.smsFollowUpEnabled) {
        const smsBody = analysis.appointmentBooked ? `Hi! Your appointment for ${analysis.serviceRequested} at ${shop.name} has been noted. We'll confirm the details shortly. Reply STOP to opt out.` : `Thanks for calling ${shop.name}! If you need anything, call us at ${shop.phone || "our shop"}. Reply STOP to opt out.`;
        await sendSMS({ to: callLog.callerPhone, body: smsBody });
      }
    }
  } catch (err) {
    console.error("[POST-CALL] SMS follow-up error:", err);
  }
}

// server/services/twilioWebhooks.ts
import { eq as eq14, sql as sql6 } from "drizzle-orm";

// server/_core/env.ts
var ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioValidationEnabled: process.env.TWILIO_VALIDATION_ENABLED !== "false",
  // ElevenLabs
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",
  hubspotApiKey: process.env.HUBSPOT_API_KEY ?? ""
};

// server/services/twilioWebhooks.ts
var twilioRouter = Router2();
function generateVoicemailTwiML(shopName) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">
    Thank you for calling ${escapeXml(shopName)}. 
    We're sorry, but our AI assistant is temporarily unavailable. 
    Please leave a message after the beep with your name, phone number, 
    and a brief description of what you need, and we'll get back to you 
    as soon as possible.
  </Say>
  <Record 
    maxLength="120" 
    action="/api/twilio/recording-complete" 
    transcribe="true" 
    transcribeCallback="/api/twilio/transcription-complete"
  />
  <Say voice="Polly.Joanna">We didn't receive a recording. Goodbye.</Say>
</Response>`;
}
async function registerElevenLabsCall(elevenLabsAgentId, fromNumber, toNumber, shopContext, callerName, callerRole) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3e3);
  const response = await fetch(
    "https://api.elevenlabs.io/v1/convai/twilio/register-call",
    {
      method: "POST",
      signal: controller.signal,
      headers: {
        "xi-api-key": ENV.elevenLabsApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_id: elevenLabsAgentId,
        from_number: fromNumber,
        to_number: toNumber,
        direction: "inbound",
        conversation_initiation_client_data: {
          dynamic_variables: {
            baylio_system_prompt: shopContext ? compileSystemPrompt(shopContext) : "You are a helpful assistant.",
            baylio_greeting: shopContext ? compileGreeting(shopContext) : "Hello, how can I help you today?",
            caller_number: fromNumber,
            caller_name: callerName || "Unknown Caller"
          }
        }
      })
    }
  );
  clearTimeout(timeout);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ElevenLabs Register Call failed (${response.status}): ${errorText}`
    );
  }
  return await response.text();
}
function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
async function resolveShopContext(calledNumber) {
  let shopId = contextCache.getShopIdByPhone(calledNumber);
  if (shopId === null) {
    const db = await getDb();
    if (!db) return null;
    const results = await db.select().from(shops).where(eq14(shops.twilioPhoneNumber, calledNumber)).limit(1);
    if (results.length === 0) return null;
    shopId = results[0].id;
    contextCache.setPhoneToShopId(calledNumber, shopId);
  }
  let context = contextCache.getShopContext(shopId);
  let elevenLabsAgentId = "";
  if (!context) {
    const db = await getDb();
    if (!db) return null;
    const shopResults = await db.select().from(shops).where(eq14(shops.id, shopId)).limit(1);
    if (shopResults.length === 0) return null;
    const shop = shopResults[0];
    const agentResults = await db.select().from(agentConfigs).where(eq14(agentConfigs.shopId, shopId)).limit(1);
    const agent = agentResults[0];
    elevenLabsAgentId = agent?.elevenLabsAgentId || "";
    context = {
      shopName: shop.name,
      agentName: agent?.agentName || "Baylio",
      phone: shop.phone || "",
      address: shop.address || "",
      city: shop.city || "",
      state: shop.state || "",
      timezone: shop.timezone || "America/New_York",
      businessHours: shop.businessHours || {},
      serviceCatalog: shop.serviceCatalog || [],
      upsellRules: agent?.upsellRules || [],
      confidenceThreshold: parseFloat(
        agent?.confidenceThreshold?.toString() || "0.80"
      ),
      maxUpsellsPerCall: agent?.maxUpsellsPerCall || 1,
      greeting: agent?.greeting || "",
      language: agent?.language || "en",
      customSystemPrompt: agent?.systemPrompt || void 0
    };
    contextCache.setShopContext(shopId, context);
  }
  if (!elevenLabsAgentId) {
    const db = await getDb();
    if (db) {
      const agentResults = await db.select({ elevenLabsAgentId: agentConfigs.elevenLabsAgentId }).from(agentConfigs).where(eq14(agentConfigs.shopId, shopId)).limit(1);
      elevenLabsAgentId = agentResults[0]?.elevenLabsAgentId || "";
    }
  }
  return { shopId, context, elevenLabsAgentId };
}
async function lookupCallerProfile(phone) {
  try {
    const db = await getDb();
    if (!db) return null;
    const results = await db.select({
      name: callerProfiles.name,
      callerRole: callerProfiles.callerRole
    }).from(callerProfiles).where(eq14(callerProfiles.phone, phone)).limit(1);
    return results[0] || null;
  } catch {
    return null;
  }
}
async function ensureCallerProfile(phone) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(callerProfiles).values({
      phone,
      callerRole: "unknown",
      callCount: 1,
      lastCalledAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: callerProfiles.phone,
      set: {
        callCount: sql6`${callerProfiles.callCount} + 1`,
        lastCalledAt: /* @__PURE__ */ new Date()
      }
    });
  } catch (err) {
    console.error("[CALLER-PROFILE] Error upserting caller profile:", err);
  }
}
twilioRouter.post("/voice", async (req, res) => {
  const startTime = Date.now();
  try {
    const { To, From, CallSid, CallStatus } = req.body;
    console.log(`[CALL] Inbound call: ${From} \u2192 ${To} (SID: ${CallSid})`);
    const callerProfile = await lookupCallerProfile(From);
    setImmediate(() => ensureCallerProfile(From));
    const callerName = callerProfile?.name || "Unknown Caller";
    const callerRole = callerProfile?.callerRole || "unknown";
    const resolved = await resolveShopContext(To);
    if (!resolved) {
      console.warn(`[CALL] No shop found for number: ${To}`);
      res.type("text/xml");
      return res.send(generateVoicemailTwiML("this business"));
    }
    const { shopId, context, elevenLabsAgentId } = resolved;
    console.log(
      `[CALL] Step 2: Shop resolved \u2014 id=${shopId}, name="${context.shopName}", agentId=${elevenLabsAgentId || "(none)"}`
    );
    if (!elevenLabsAgentId) {
      console.warn(`[CALL] No ElevenLabs agent configured for shop ${shopId}`);
      res.type("text/xml");
      return res.send(generateVoicemailTwiML(context.shopName));
    }
    console.log(
      `[CALL] Registering call with ElevenLabs agent ${elevenLabsAgentId} for shop ${shopId} (caller: ${callerName})...`
    );
    const twiml = await registerElevenLabsCall(
      elevenLabsAgentId,
      From,
      To,
      context,
      callerName,
      callerRole
    );
    const elapsed = Date.now() - startTime;
    console.log(
      `[CALL] Step 4: ElevenLabs registered OK for shop ${shopId} (${elapsed}ms). TwiML length=${twiml.length}`
    );
    res.type("text/xml");
    return res.send(twiml);
  } catch (error) {
    console.error("[CALL] Error handling inbound call:", error);
    res.type("text/xml");
    return res.send(generateVoicemailTwiML("this business"));
  }
});
twilioRouter.post("/status", async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, To, From, RecordingUrl } = req.body;
    console.log(
      `[CALL-STATUS] ${CallSid}: ${CallStatus} (duration: ${CallDuration}s)`
    );
    setImmediate(async () => {
      try {
        const db = await getDb();
        if (!db) return;
        if (CallStatus === "completed" || CallStatus === "no-answer" || CallStatus === "busy" || CallStatus === "failed") {
          const shopResult = await db.select({ id: shops.id, ownerId: shops.ownerId }).from(shops).where(eq14(shops.twilioPhoneNumber, To)).limit(1);
          if (shopResult.length > 0) {
            const shop = shopResult[0];
            const callerProfile = await lookupCallerProfile(From);
            const callerName = callerProfile?.name || null;
            await db.insert(callLogs).values({
              shopId: shop.id,
              ownerId: shop.ownerId,
              twilioCallSid: CallSid,
              callerPhone: From,
              callerName,
              direction: "inbound",
              status: CallStatus === "completed" ? "completed" : "missed",
              duration: parseInt(CallDuration) || 0,
              recordingUrl: RecordingUrl || null,
              callStartedAt: /* @__PURE__ */ new Date(),
              callEndedAt: /* @__PURE__ */ new Date()
            }).onConflictDoUpdate({
              target: callLogs.twilioCallSid,
              set: {
                status: CallStatus === "completed" ? "completed" : "missed",
                duration: parseInt(CallDuration) || 0,
                recordingUrl: RecordingUrl || null,
                callEndedAt: /* @__PURE__ */ new Date()
              }
            });
            if (CallStatus === "completed") {
              try {
                const callLogResult = await db.select({ id: callLogs.id }).from(callLogs).where(eq14(callLogs.twilioCallSid, CallSid)).limit(1);
                if (callLogResult.length > 0) {
                  await processCompletedCall(callLogResult[0].id);
                }
              } catch (pipelineErr) {
                console.error(
                  "[CALL-STATUS] Post-call pipeline error (non-fatal):",
                  pipelineErr
                );
              }
            }
          }
        }
      } catch (err) {
        console.error("[CALL-STATUS] Error logging call:", err);
      }
    });
    res.status(200).send("OK");
  } catch (error) {
    console.error("[CALL-STATUS] Error:", error);
    res.status(200).send("OK");
  }
});
twilioRouter.post(
  "/recording-complete",
  async (req, res) => {
    try {
      const { CallSid, RecordingUrl, RecordingDuration } = req.body;
      console.log(
        `[RECORDING] Recording complete for ${CallSid}: ${RecordingUrl} (${RecordingDuration}s)`
      );
      setImmediate(async () => {
        try {
          const db = await getDb();
          if (!db) return;
          await db.update(callLogs).set({ recordingUrl: RecordingUrl }).where(eq14(callLogs.twilioCallSid, CallSid));
        } catch (err) {
          console.error("[RECORDING] Error updating call log:", err);
        }
      });
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    } catch (error) {
      console.error("[RECORDING] Error:", error);
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  }
);
twilioRouter.post(
  "/transcription-complete",
  async (req, res) => {
    try {
      const { CallSid, TranscriptionText, TranscriptionStatus } = req.body;
      console.log(`[TRANSCRIPTION] ${CallSid}: ${TranscriptionStatus}`);
      if (TranscriptionStatus === "completed" && TranscriptionText) {
        setImmediate(async () => {
          try {
            const db = await getDb();
            if (!db) return;
            await db.update(callLogs).set({ transcription: TranscriptionText }).where(eq14(callLogs.twilioCallSid, CallSid));
          } catch (err) {
            console.error("[TRANSCRIPTION] Error updating call log:", err);
          }
        });
      }
      res.status(200).send("OK");
    } catch (error) {
      console.error("[TRANSCRIPTION] Error:", error);
      res.status(200).send("OK");
    }
  }
);
twilioRouter.get("/health", (_req, res) => {
  const cacheStats = contextCache.getStats();
  res.json({
    status: "ok",
    service: "baylio-twilio-bridge",
    cache: cacheStats,
    env: {
      hasTwilioAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasTwilioAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasElevenLabsApiKey: !!ENV.elevenLabsApiKey,
      webhookBaseUrl: process.env.WEBHOOK_BASE_URL || "(not set)"
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});

// server/middleware/twilioValidation.ts
import crypto from "crypto";
function computeExpectedSignature(authToken, url, params = {}) {
  const data = Object.keys(params).sort().reduce((acc, key) => acc + key + params[key], url);
  return crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
}
function timingSafeCompare(a, b) {
  if (a.length !== b.length) {
    const bufA2 = Buffer.from(a, "utf-8");
    const bufB2 = Buffer.from(a, "utf-8");
    crypto.timingSafeEqual(bufA2, bufB2);
    return false;
  }
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  return crypto.timingSafeEqual(bufA, bufB);
}
function logForensic(level, message, details) {
  const entry = {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    service: "twilio-validation",
    level,
    message,
    ...details
  };
  if (level === "error" || level === "warn") {
    console.error(`[SECURITY] ${JSON.stringify(entry)}`);
  } else {
    console.log(`[SECURITY] ${JSON.stringify(entry)}`);
  }
}
function validateTwilioSignature(options = {}) {
  return (req, res, next) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const validationEnabled = process.env.TWILIO_VALIDATION_ENABLED !== "false";
    if (!authToken) {
      logForensic(
        "error",
        "TWILIO_AUTH_TOKEN not configured \u2014 rejecting webhook",
        {
          ip: req.ip,
          path: req.path,
          method: req.method
        }
      );
      return res.status(500).json({
        error: "Server configuration error: Twilio auth token not set"
      });
    }
    if (!validationEnabled) {
      logForensic(
        "info",
        "Twilio validation disabled via TWILIO_VALIDATION_ENABLED=false",
        {
          path: req.path
        }
      );
      return next();
    }
    const twilioSignature = req.headers["x-twilio-signature"];
    if (!twilioSignature) {
      logForensic(
        "warn",
        "Missing X-Twilio-Signature header \u2014 potential spoofing attempt",
        {
          ip: req.ip,
          path: req.path,
          method: req.method,
          userAgent: req.headers["user-agent"],
          headers: Object.keys(req.headers)
        }
      );
      if (options.logOnly) {
        return next();
      }
      return res.status(403).json({
        error: "Forbidden: Missing Twilio signature"
      });
    }
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.headers["host"];
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;
    const params = req.method === "POST" ? req.body || {} : {};
    const expectedSignature = computeExpectedSignature(
      authToken,
      fullUrl,
      params
    );
    const isValid = timingSafeCompare(twilioSignature, expectedSignature);
    if (!isValid) {
      logForensic("error", "POTENTIAL WEBHOOK SPOOFING / TOLL FRAUD ATTEMPT", {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.headers["user-agent"],
        receivedSignature: twilioSignature.substring(0, 8) + "...",
        fullUrl,
        bodyKeys: Object.keys(req.body || {})
      });
      if (options.logOnly) {
        return next();
      }
      return res.status(403).json({
        error: "Forbidden: Invalid Twilio signature"
      });
    }
    logForensic("info", "Twilio webhook signature validated", {
      path: req.path,
      method: req.method
    });
    next();
  };
}

// server/stripe/stripeRoutes.ts
import express from "express";
import Stripe2 from "stripe";
import { eq as eq15 } from "drizzle-orm";
import { drizzle as drizzle2 } from "drizzle-orm/postgres-js";
import postgres2 from "postgres";
import { PostHog } from "posthog-node";
function getPostHog() {
  return new PostHog(process.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    host: process.env.VITE_PUBLIC_POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0
  });
}
var router2 = express.Router();
function getStripe2() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe2(key, { apiVersion: "2025-03-31.basil" });
}
async function getDb2() {
  if (!process.env.DATABASE_URL) return null;
  const client = postgres2(process.env.DATABASE_URL, { prepare: false });
  return drizzle2(client);
}
router2.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const stripe = getStripe2();
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook secret not configured" });
    }
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error(
        "[Stripe Webhook] Signature verification failed:",
        err.message
      );
      return res.status(400).json({ error: "Invalid signature" });
    }
    if (event.id.startsWith("evt_test_")) {
      console.log(
        "[Stripe Webhook] Test event detected, returning verification response"
      );
      return res.json({ verified: true });
    }
    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          await handleCheckoutCompleted(
            event.data.object
          );
          break;
        }
        case "invoice.paid": {
          await handleInvoicePaid(event.data.object);
          break;
        }
        case "invoice.payment_failed": {
          await handlePaymentFailed(event.data.object);
          break;
        }
        case "customer.subscription.updated": {
          await handleSubscriptionUpdated(
            event.data.object
          );
          break;
        }
        case "customer.subscription.deleted": {
          await handleSubscriptionDeleted(
            event.data.object
          );
          break;
        }
        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error(`[Stripe Webhook] Error processing ${event.type}:`, err);
      return res.status(200).json({ received: true, error: "Processing error" });
    }
    return res.json({ received: true });
  }
);
async function handleCheckoutCompleted(session) {
  const db = await getDb2();
  if (!db) return;
  const userId = session.metadata?.user_id;
  const shopId = session.metadata?.shop_id;
  const tier = session.metadata?.tier;
  const isSetupFee = session.metadata?.type === "setup_fee";
  if (isSetupFee && shopId) {
    await db.update(subscriptions).set({ setupFeePaid: true }).where(eq15(subscriptions.shopId, parseInt(shopId)));
    console.log(`[Stripe] Setup fee paid for shop ${shopId}`);
    return;
  }
  if (!userId || !shopId || !tier) {
    console.warn("[Stripe] Missing metadata in checkout session:", session.id);
    return;
  }
  const tierConfig = getTierConfig(tier);
  if (!tierConfig) return;
  const existingSubs = await db.select().from(subscriptions).where(eq15(subscriptions.shopId, parseInt(shopId))).limit(1);
  if (existingSubs.length > 0) {
    await db.update(subscriptions).set({
      tier: tierConfig.id,
      status: "active",
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      includedMinutes: tierConfig.includedMinutes
    }).where(eq15(subscriptions.shopId, parseInt(shopId)));
  } else {
    await db.insert(subscriptions).values({
      shopId: parseInt(shopId),
      ownerId: parseInt(userId),
      tier: tierConfig.id,
      status: "active",
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      includedMinutes: tierConfig.includedMinutes,
      usedMinutes: 0
    });
  }
  console.log(`[Stripe] Subscription created: shop=${shopId}, tier=${tier}`);
  const ph = getPostHog();
  ph.capture({
    distinctId: userId,
    event: "subscription_checkout_completed",
    properties: {
      shop_id: shopId,
      tier,
      billing_cycle: session.metadata?.billing_cycle,
      customer_email: session.metadata?.customer_email,
      stripe_session_id: session.id
    }
  });
  await ph.shutdown().catch(() => {
  });
}
async function handleInvoicePaid(invoice) {
  const db = await getDb2();
  if (!db) return;
  const invoiceAny = invoice;
  const subscriptionId = invoiceAny.subscription ?? invoiceAny.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;
  const subs = await db.select().from(subscriptions).where(eq15(subscriptions.stripeSubscriptionId, subscriptionId)).limit(1);
  if (subs.length > 0) {
    const periodStart = invoiceAny.period_start ?? invoiceAny.period?.start;
    const periodEnd = invoiceAny.period_end ?? invoiceAny.period?.end;
    await db.update(subscriptions).set({
      status: "active",
      usedMinutes: 0,
      currentPeriodStart: periodStart ? new Date(periodStart * 1e3) : void 0,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1e3) : void 0
    }).where(eq15(subscriptions.stripeSubscriptionId, subscriptionId));
  }
  console.log(`[Stripe] Invoice paid for subscription: ${subscriptionId}`);
}
async function handlePaymentFailed(invoice) {
  const db = await getDb2();
  if (!db) return;
  const invoiceAny2 = invoice;
  const subscriptionId = invoiceAny2.subscription ?? invoiceAny2.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;
  await db.update(subscriptions).set({ status: "past_due" }).where(eq15(subscriptions.stripeSubscriptionId, subscriptionId));
  console.log(`[Stripe] Payment failed for subscription: ${subscriptionId}`);
  const subs = await db.select().from(subscriptions).where(eq15(subscriptions.stripeSubscriptionId, subscriptionId)).limit(1);
  if (subs.length > 0) {
    const ph = getPostHog();
    ph.capture({
      distinctId: String(subs[0].ownerId),
      event: "subscription_payment_failed",
      properties: { stripe_subscription_id: subscriptionId, shop_id: subs[0].shopId }
    });
    await ph.shutdown().catch(() => {
    });
  }
}
async function handleSubscriptionUpdated(sub) {
  const db = await getDb2();
  if (!db) return;
  const statusMap = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    trialing: "trialing"
  };
  const status = statusMap[sub.status] || "active";
  await db.update(subscriptions).set({
    status,
    currentPeriodStart: new Date(
      (sub.current_period_start ?? 0) * 1e3
    ),
    currentPeriodEnd: new Date((sub.current_period_end ?? 0) * 1e3)
  }).where(eq15(subscriptions.stripeSubscriptionId, sub.id));
  console.log(`[Stripe] Subscription updated: ${sub.id} \u2192 ${status}`);
}
async function handleSubscriptionDeleted(sub) {
  const db = await getDb2();
  if (!db) return;
  await db.update(subscriptions).set({ status: "canceled" }).where(eq15(subscriptions.stripeSubscriptionId, sub.id));
  console.log(`[Stripe] Subscription canceled: ${sub.id}`);
  const db2 = await getDb2();
  if (db2) {
    const canceledSubs = await db2.select().from(subscriptions).where(eq15(subscriptions.stripeSubscriptionId, sub.id)).limit(1);
    if (canceledSubs.length > 0) {
      const ph = getPostHog();
      ph.capture({
        distinctId: String(canceledSubs[0].ownerId),
        event: "subscription_cancelled",
        properties: { stripe_subscription_id: sub.id, shop_id: canceledSubs[0].shopId, tier: canceledSubs[0].tier }
      });
      await ph.shutdown().catch(() => {
      });
    }
  }
}

// server/vercel-entry.ts
var app = express2();
app.set("trust proxy", 1);
app.use("/api/stripe", router2);
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ limit: "50mb", extended: true }));
app.use(
  "/api/twilio",
  validateTwilioSignature({ logOnly: true }),
  twilioRouter
);
app.use("/api/integrations/google", googleAuthRouter);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
var vercel_entry_default = app;
export {
  vercel_entry_default as default
};
