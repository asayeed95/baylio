import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  decimal,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Organizations (Multi-location grouping) ─────────────────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── Shops ───────────────────────────────────────────────────────────
export const shops = mysqlTable("shops", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  organizationId: int("organizationId"),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  city: varchar("city", { length: 128 }),
  state: varchar("state", { length: 64 }),
  zip: varchar("zip", { length: 16 }),
  timezone: varchar("timezone", { length: 64 }).default("America/New_York"),
  businessHours: json("businessHours").$type<Record<string, { open: string; close: string; closed: boolean }>>(),
  serviceCatalog: json("serviceCatalog").$type<Array<{ name: string; category: string; price?: number; description?: string }>>(),
  isActive: boolean("isActive").default(true).notNull(),
  twilioPhoneNumber: varchar("twilioPhoneNumber", { length: 32 }),
  twilioPhoneSid: varchar("twilioPhoneSid", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shop = typeof shops.$inferSelect;
export type InsertShop = typeof shops.$inferInsert;

// ─── AI Agent Config ─────────────────────────────────────────────────
export const agentConfigs = mysqlTable("agent_configs", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  voiceId: varchar("voiceId", { length: 128 }),
  voiceName: varchar("voiceName", { length: 128 }),
  agentName: varchar("agentName", { length: 128 }).default("Baylio"),
  systemPrompt: text("systemPrompt"),
  greeting: text("greeting"),
  upsellEnabled: boolean("upsellEnabled").default(true).notNull(),
  upsellRules: json("upsellRules").$type<Array<{ symptom: string; service: string; adjacent: string; confidence: number }>>(),
  confidenceThreshold: decimal("confidenceThreshold", { precision: 3, scale: 2 }).default("0.80"),
  maxUpsellsPerCall: int("maxUpsellsPerCall").default(1),
  language: varchar("language", { length: 16 }).default("en"),
  elevenLabsAgentId: varchar("elevenLabsAgentId", { length: 128 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgentConfig = typeof agentConfigs.$inferSelect;
export type InsertAgentConfig = typeof agentConfigs.$inferInsert;

// ─── Call Logs ───────────────────────────────────────────────────────
export const callLogs = mysqlTable("call_logs", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  twilioCallSid: varchar("twilioCallSid", { length: 128 }),
  callerPhone: varchar("callerPhone", { length: 32 }),
  callerName: varchar("callerName", { length: 255 }),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).default("inbound").notNull(),
  status: mysqlEnum("status", ["completed", "missed", "voicemail", "transferred", "failed"]).default("completed").notNull(),
  duration: int("duration").default(0),
  recordingUrl: text("recordingUrl"),
  transcription: text("transcription"),
  summary: text("summary"),
  customerIntent: varchar("customerIntent", { length: 255 }),
  serviceRequested: varchar("serviceRequested", { length: 255 }),
  appointmentBooked: boolean("appointmentBooked").default(false),
  upsellAttempted: boolean("upsellAttempted").default(false),
  upsellAccepted: boolean("upsellAccepted").default(false),
  sentimentScore: decimal("sentimentScore", { precision: 3, scale: 2 }),
  qualityScore: decimal("qualityScore", { precision: 3, scale: 2 }),
  qaFlags: json("qaFlags").$type<string[]>(),
  estimatedRevenue: decimal("estimatedRevenue", { precision: 10, scale: 2 }),
  callStartedAt: timestamp("callStartedAt"),
  callEndedAt: timestamp("callEndedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

// ─── Missed Call Audits ──────────────────────────────────────────────
export const missedCallAudits = mysqlTable("missed_call_audits", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId"),
  prospectName: varchar("prospectName", { length: 255 }),
  prospectEmail: varchar("prospectEmail", { length: 320 }),
  prospectPhone: varchar("prospectPhone", { length: 32 }),
  shopName: varchar("shopName", { length: 255 }),
  forwardingNumber: varchar("forwardingNumber", { length: 32 }),
  forwardingNumberSid: varchar("forwardingNumberSid", { length: 64 }),
  status: mysqlEnum("auditStatus", ["pending", "active", "completed", "expired"]).default("pending").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  totalMissedCalls: int("totalMissedCalls").default(0),
  estimatedLostRevenue: decimal("estimatedLostRevenue", { precision: 10, scale: 2 }),
  scorecardUrl: text("scorecardUrl"),
  scorecardData: json("scorecardData").$type<{
    callsByDayPart: Record<string, number>;
    intentBreakdown: Record<string, number>;
    urgencyBreakdown: Record<string, number>;
    estimatedRevenueRange: { low: number; high: number };
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MissedCallAudit = typeof missedCallAudits.$inferSelect;
export type InsertMissedCallAudit = typeof missedCallAudits.$inferInsert;

// ─── Audit Call Entries ──────────────────────────────────────────────
export const auditCallEntries = mysqlTable("audit_call_entries", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  callerPhone: varchar("callerPhone", { length: 32 }),
  callTimestamp: timestamp("callTimestamp"),
  dayPart: mysqlEnum("dayPart", ["morning", "afternoon", "evening", "night"]),
  intentCategory: varchar("intentCategory", { length: 128 }),
  urgencyLevel: mysqlEnum("urgencyLevel", ["low", "medium", "high", "emergency"]),
  estimatedTicketValue: decimal("estimatedTicketValue", { precision: 10, scale: 2 }),
  bookingLikelihood: decimal("bookingLikelihood", { precision: 3, scale: 2 }),
  isRepeatCaller: boolean("isRepeatCaller").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditCallEntry = typeof auditCallEntries.$inferSelect;
export type InsertAuditCallEntry = typeof auditCallEntries.$inferInsert;

// ─── Subscriptions ───────────────────────────────────────────────────
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  shopId: int("shopId").notNull(),
  organizationId: int("organizationId"),
  tier: mysqlEnum("tier", ["starter", "pro", "elite"]).default("starter").notNull(),
  status: mysqlEnum("subStatus", ["active", "past_due", "canceled", "trialing"]).default("active").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  includedMinutes: int("includedMinutes").default(300).notNull(),
  usedMinutes: int("usedMinutes").default(0).notNull(),
  overageRate: decimal("overageRate", { precision: 5, scale: 4 }).default("0.1500"),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "annual"]).default("monthly").notNull(),
  setupFeePaid: boolean("setupFeePaid").default(false),
  setupFeeAmount: decimal("setupFeeAmount", { precision: 10, scale: 2 }),
  currentPeriodStart: timestamp("currentPeriodStart"),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Usage Records ───────────────────────────────────────────────────
export const usageRecords = mysqlTable("usage_records", {
  id: int("id").autoincrement().primaryKey(),
  subscriptionId: int("subscriptionId").notNull(),
  shopId: int("shopId").notNull(),
  callLogId: int("callLogId"),
  minutesUsed: decimal("minutesUsed", { precision: 8, scale: 2 }).notNull(),
  isOverage: boolean("isOverage").default(false).notNull(),
  overageCharge: decimal("overageCharge", { precision: 10, scale: 2 }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type UsageRecord = typeof usageRecords.$inferSelect;
export type InsertUsageRecord = typeof usageRecords.$inferInsert;

// ─── Notifications ───────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  shopId: int("shopId"),
  type: mysqlEnum("notificationType", [
    "new_call",
    "high_value_lead",
    "missed_call",
    "system_issue",
    "weekly_summary",
    "usage_warning",
    "audit_complete",
    "payment_issue",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;