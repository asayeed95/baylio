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
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const directionEnum = pgEnum("direction", ["inbound", "outbound"]);
export const callStatusEnum = pgEnum("call_status", ["completed", "missed", "voicemail", "transferred", "failed"]);
export const auditStatusEnum = pgEnum("audit_status", ["pending", "active", "completed", "expired"]);
export const dayPartEnum = pgEnum("day_part", ["morning", "afternoon", "evening", "night"]);
export const urgencyLevelEnum = pgEnum("urgency_level", ["low", "medium", "high", "emergency"]);
export const tierEnum = pgEnum("tier", ["trial", "starter", "pro", "elite"]);
export const subStatusEnum = pgEnum("sub_status", ["active", "past_due", "canceled", "trialing"]);
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "annual"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "new_call", "high_value_lead", "missed_call", "system_issue",
  "weekly_summary", "usage_warning", "audit_complete", "payment_issue",
]);
export const partnerTierEnum = pgEnum("partner_tier", ["bronze", "silver", "gold", "platinum"]);
export const partnerStatusEnum = pgEnum("partner_status", ["pending", "active", "suspended"]);
export const payoutMethodEnum = pgEnum("payout_method", ["stripe", "paypal", "bank_transfer"]);
export const referralStatusEnum = pgEnum("referral_status", ["pending", "signed_up", "subscribed", "churned"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);
export const callerRoleEnum = pgEnum("caller_role", ["prospect", "shop_owner", "founder", "tester", "vendor", "unknown"]);
export const integrationProviderEnum = pgEnum("integration_provider", ["google_calendar", "google_sheets", "shopmonkey", "tekmetric", "hubspot"]);
export const syncStatusEnum = pgEnum("sync_status", ["success", "failed"]);
export const supportStatusEnum = pgEnum("support_status", ["new", "triaged", "in_progress", "shipped", "declined", "spam"]);
export const supportCategoryEnum = pgEnum("support_category", ["feature_request", "bug_report", "question", "billing", "language_request", "integration_request", "other"]);
export const supportPriorityEnum = pgEnum("support_priority", ["low", "medium", "high", "urgent"]);

// ─── Users ───────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  supabaseId: varchar("supabaseId", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Organizations (Multi-location grouping) ─────────────────────────
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  ownerId: integer("ownerId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── Shops ───────────────────────────────────────────────────────────
export const shops = pgTable("shops", {
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
  businessHours: jsonb("businessHours").$type<Record<string, { open: string; close: string; closed: boolean }>>(),
  serviceCatalog: jsonb("serviceCatalog").$type<Array<{ name: string; category: string; price?: number; description?: string }>>(),
  isActive: boolean("isActive").default(true).notNull(),
  smsFollowUpEnabled: boolean("smsFollowUpEnabled").default(true).notNull(),
  ringShopFirstEnabled: boolean("ringShopFirstEnabled").default(true).notNull(),
  ringTimeoutSec: integer("ringTimeoutSec").default(12).notNull(),
  twilioPhoneNumber: varchar("twilioPhoneNumber", { length: 32 }),
  twilioPhoneSid: varchar("twilioPhoneSid", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Shop = typeof shops.$inferSelect;
export type InsertShop = typeof shops.$inferInsert;

// ─── AI Agent Config ─────────────────────────────────────────────────
export const agentConfigs = pgTable("agent_configs", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  ownerId: integer("ownerId").notNull().default(0),
  voiceId: varchar("voiceId", { length: 128 }),
  voiceName: varchar("voiceName", { length: 128 }),
  agentName: varchar("agentName", { length: 128 }).default("Baylio"),
  systemPrompt: text("systemPrompt"),
  greeting: text("greeting"),
  upsellEnabled: boolean("upsellEnabled").default(true).notNull(),
  upsellRules: jsonb("upsellRules").$type<Array<{ symptom: string; service: string; adjacent: string; confidence: number }>>(),
  confidenceThreshold: numeric("confidenceThreshold", { precision: 3, scale: 2 }).default("0.80"),
  maxUpsellsPerCall: integer("maxUpsellsPerCall").default(1),
  language: varchar("language", { length: 16 }).default("en"),
  elevenLabsAgentId: varchar("elevenLabsAgentId", { length: 128 }),
  characterPreset: varchar("characterPreset", { length: 32 }).default("warm_helper").notNull(),
  warmth: integer("warmth").default(4).notNull(),
  salesIntensity: integer("salesIntensity").default(3).notNull(),
  technicalDepth: integer("technicalDepth").default(2).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AgentConfig = typeof agentConfigs.$inferSelect;
export type InsertAgentConfig = typeof agentConfigs.$inferInsert;

// ─── Call Logs ───────────────────────────────────────────────────────
export const callLogs = pgTable("call_logs", {
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
  qaFlags: jsonb("qaFlags").$type<string[]>(),
  estimatedRevenue: numeric("estimatedRevenue", { precision: 10, scale: 2 }),
  scorecardData: jsonb("scorecardData").$type<{
    greeting: number; problemId: number; serviceRec: number;
    upsell: number; appointment: number; closing: number;
    overall: number; suggestions: string[];
  }>(),
  handledByAI: boolean("handledByAI").default(false).notNull(),
  callStartedAt: timestamp("callStartedAt"),
  callEndedAt: timestamp("callEndedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = typeof callLogs.$inferInsert;

// ─── Missed Call Audits ──────────────────────────────────────────────
export const missedCallAudits = pgTable("missed_call_audits", {
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
  scorecardData: jsonb("scorecardData").$type<{
    callsByDayPart: Record<string, number>;
    intentBreakdown: Record<string, number>;
    urgencyBreakdown: Record<string, number>;
    estimatedRevenueRange: { low: number; high: number };
  }>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type MissedCallAudit = typeof missedCallAudits.$inferSelect;
export type InsertMissedCallAudit = typeof missedCallAudits.$inferInsert;

// ─── Audit Call Entries ──────────────────────────────────────────────
export const auditCallEntries = pgTable("audit_call_entries", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditCallEntry = typeof auditCallEntries.$inferSelect;
export type InsertAuditCallEntry = typeof auditCallEntries.$inferInsert;

// ─── Subscriptions ───────────────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ─── Usage Records ───────────────────────────────────────────────────
export const usageRecords = pgTable("usage_records", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscriptionId").notNull(),
  shopId: integer("shopId").notNull(),
  ownerId: integer("ownerId").notNull().default(0),
  callLogId: integer("callLogId"),
  minutesUsed: numeric("minutesUsed", { precision: 8, scale: 2 }).notNull(),
  isOverage: boolean("isOverage").default(false).notNull(),
  overageCharge: numeric("overageCharge", { precision: 10, scale: 2 }),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
});

export type UsageRecord = typeof usageRecords.$inferSelect;
export type InsertUsageRecord = typeof usageRecords.$inferInsert;

// ─── Notifications ───────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  shopId: integer("shopId"),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ─── Partners ───────────────────────────────────────────────────────
export const partners = pgTable("partners", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;

// ─── Referrals ──────────────────────────────────────────────────────
export const referrals = pgTable("referrals", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// ─── Partner Payouts ────────────────────────────────────────────────
export const partnerPayouts = pgTable("partner_payouts", {
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PartnerPayout = typeof partnerPayouts.$inferSelect;
export type InsertPartnerPayout = typeof partnerPayouts.$inferInsert;

// ─── Caller Profiles ────────────────────────────────────────────────
export const callerProfiles = pgTable("caller_profiles", {
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
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type CallerProfile = typeof callerProfiles.$inferSelect;
export type InsertCallerProfile = typeof callerProfiles.$inferInsert;

// ─── Contact Submissions ────────────────────────────────────────────
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;

// ─── Support Tickets ────────────────────────────────────────────────
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  fromEmail: varchar("fromEmail", { length: 320 }).notNull(),
  fromName: varchar("fromName", { length: 255 }),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  bodyHtml: text("bodyHtml"),
  messageId: varchar("messageId", { length: 500 }),
  status: supportStatusEnum("status").default("new").notNull(),
  category: supportCategoryEnum("category"),
  priority: supportPriorityEnum("priority"),
  summary: text("summary"),
  adminNotes: text("adminNotes"),
  autoAckSentAt: timestamp("autoAckSentAt"),
  triagedAt: timestamp("triagedAt"),
  shippedAt: timestamp("shippedAt"),
  assignedToUserId: integer("assignedToUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

// ─── Shop Integrations ──────────────────────────────────────────────
export const shopIntegrations = pgTable("shop_integrations", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  provider: integrationProviderEnum("provider").notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  externalAccountId: varchar("externalAccountId", { length: 255 }),
  settings: jsonb("settings").$type<Record<string, unknown>>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ShopIntegration = typeof shopIntegrations.$inferSelect;
export type InsertShopIntegration = typeof shopIntegrations.$inferInsert;

// ─── Integration Sync Logs ─────────────────────────────────────────
export const integrationSyncLogs = pgTable("integration_sync_logs", {
  id: serial("id").primaryKey(),
  shopId: integer("shopId").notNull(),
  provider: varchar("provider", { length: 64 }).notNull(),
  action: varchar("action", { length: 64 }).notNull(),
  status: syncStatusEnum("status").notNull(),
  errorMessage: text("errorMessage"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type IntegrationSyncLog = typeof integrationSyncLogs.$inferSelect;
export type InsertIntegrationSyncLog = typeof integrationSyncLogs.$inferInsert;

// ─── Sam Leads ──────────────────────────────────────────────────────
// Captured by the Sam sales agent during inbound calls to 844-875-2441.
// Pushed to Baylio's HubSpot under the platform account (not per-shop).
export const samLeadIntentEnum = pgEnum("sam_lead_intent", [
  "shop_owner_prospect",
  "curious_tester",
  "car_question",
  "existing_customer",
  "onboarding_help",
  "other",
]);

export const samLeads = pgTable("sam_leads", {
  id: serial("id").primaryKey(),
  callerPhone: varchar("callerPhone", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  shopName: varchar("shopName", { length: 255 }),
  city: varchar("city", { length: 128 }),
  intent: samLeadIntentEnum("intent").default("other").notNull(),
  intentSummary: text("intentSummary"),
  language: varchar("language", { length: 16 }).default("en"),
  marketingConsent: boolean("marketingConsent").default(false).notNull(),
  smsSent: boolean("smsSent").default(false).notNull(),
  emailSent: boolean("emailSent").default(false).notNull(),
  transferredToHuman: boolean("transferredToHuman").default(false).notNull(),
  hubspotContactId: varchar("hubspotContactId", { length: 64 }),
  conversationId: varchar("conversationId", { length: 128 }),
  callCount: integer("callCount").default(1).notNull(),
  lastCalledAt: timestamp("lastCalledAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (t) => ({
  callerPhoneIdx: uniqueIndex("sam_leads_callerPhone_idx").on(t.callerPhone),
}));

export type SamLead = typeof samLeads.$inferSelect;
export type InsertSamLead = typeof samLeads.$inferInsert;
