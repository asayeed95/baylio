/**
 * Admin Analytics Router
 *
 * Provides aggregate analytics data for the admin dashboard:
 * - Call volume over time (daily/weekly/monthly)
 * - Revenue recovered via missed call audits
 * - Active subscriptions and MRR
 * - Top performing shops by call volume
 * - Conversion funnel (prospects → signups → trials → paid)
 * - Affiliate referral stats
 *
 * All procedures are admin-only.
 */
import { z } from "zod";
import { sql, eq, gte, lte, and, desc, count, sum } from "drizzle-orm";
import { adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  callLogs,
  missedCallAudits,
  subscriptions,
  shops,
  affiliates,
  affiliateReferrals,
  prospects,
  users,
} from "../drizzle/schema";

/** Tier monthly prices (must match subscriptionRouter TIER_CONFIG). */
const TIER_MONTHLY_PRICE: Record<string, number> = {
  pilot: 149,
  starter: 199,
  pro: 349,
  elite: 599,
};

export const analyticsRouter = router({
  /**
   * Call volume grouped by day, week, or month.
   * Returns an array of { period, total, completed, missed } objects.
   */
  callVolume: adminProcedure
    .input(
      z.object({
        granularity: z.enum(["daily", "weekly", "monthly"]).default("daily"),
        days: z.number().min(7).max(365).default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [] };

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const dateFormat =
        input.granularity === "daily"
          ? sql`DATE_FORMAT(${callLogs.createdAt}, '%Y-%m-%d')`
          : input.granularity === "weekly"
          ? sql`DATE_FORMAT(${callLogs.createdAt}, '%x-W%v')`
          : sql`DATE_FORMAT(${callLogs.createdAt}, '%Y-%m')`;

      const rows = await db
        .select({
          period: dateFormat.as("period"),
          total: count().as("total"),
          completed: sum(
            sql`CASE WHEN ${callLogs.status} = 'completed' THEN 1 ELSE 0 END`
          ).as("completed"),
          missed: sum(
            sql`CASE WHEN ${callLogs.status} = 'missed' THEN 1 ELSE 0 END`
          ).as("missed"),
        })
        .from(callLogs)
        .where(gte(callLogs.createdAt, since))
        .groupBy(sql`period`)
        .orderBy(sql`period`);

      return {
        data: rows.map((r) => ({
          period: String(r.period),
          total: Number(r.total),
          completed: Number(r.completed ?? 0),
          missed: Number(r.missed ?? 0),
        })),
      };
    }),

  /**
   * Revenue recovered via missed call audits.
   * Groups estimated lost revenue by month.
   */
  revenueRecovered: adminProcedure
    .input(
      z.object({
        days: z.number().min(7).max(365).default(90),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [], totals: { audits: 0, missedCalls: 0, estimatedLost: 0 } };

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const rows = await db
        .select({
          period: sql`DATE_FORMAT(${missedCallAudits.createdAt}, '%Y-%m')`.as("period"),
          audits: count().as("audits"),
          missedCalls: sum(missedCallAudits.totalMissedCalls).as("missedCalls"),
          estimatedLost: sum(missedCallAudits.estimatedLostRevenue).as("estimatedLost"),
        })
        .from(missedCallAudits)
        .where(gte(missedCallAudits.createdAt, since))
        .groupBy(sql`period`)
        .orderBy(sql`period`);

      const totals = rows.reduce(
        (acc, r) => ({
          audits: acc.audits + Number(r.audits),
          missedCalls: acc.missedCalls + Number(r.missedCalls ?? 0),
          estimatedLost: acc.estimatedLost + Number(r.estimatedLost ?? 0),
        }),
        { audits: 0, missedCalls: 0, estimatedLost: 0 }
      );

      return {
        data: rows.map((r) => ({
          period: String(r.period),
          audits: Number(r.audits),
          missedCalls: Number(r.missedCalls ?? 0),
          estimatedLost: Number(r.estimatedLost ?? 0),
        })),
        totals,
      };
    }),

  /**
   * Active subscription counts and MRR breakdown by tier.
   */
  subscriptionMetrics: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { tiers: [], totalActive: 0, totalTrialing: 0, mrr: 0 };

    const rows = await db
      .select({
        tier: subscriptions.tier,
        status: subscriptions.status,
        count: count().as("count"),
      })
      .from(subscriptions)
      .groupBy(subscriptions.tier, subscriptions.status);

    const tiers: Record<string, { active: number; trialing: number; canceled: number; pastDue: number }> = {};
    let totalActive = 0;
    let totalTrialing = 0;
    let mrr = 0;

    for (const row of rows) {
      if (!tiers[row.tier]) {
        tiers[row.tier] = { active: 0, trialing: 0, canceled: 0, pastDue: 0 };
      }
      const cnt = Number(row.count);
      if (row.status === "active") {
        tiers[row.tier].active = cnt;
        totalActive += cnt;
        mrr += cnt * (TIER_MONTHLY_PRICE[row.tier] ?? 0);
      } else if (row.status === "trialing") {
        tiers[row.tier].trialing = cnt;
        totalTrialing += cnt;
      } else if (row.status === "canceled") {
        tiers[row.tier].canceled = cnt;
      } else if (row.status === "past_due") {
        tiers[row.tier].pastDue = cnt;
      }
    }

    return {
      tiers: Object.entries(tiers).map(([tier, data]) => ({
        tier,
        price: TIER_MONTHLY_PRICE[tier] ?? 0,
        ...data,
      })),
      totalActive,
      totalTrialing,
      mrr,
    };
  }),

  /**
   * Top shops ranked by call volume over a period.
   */
  topShops: adminProcedure
    .input(z.object({ days: z.number().min(7).max(365).default(30), limit: z.number().min(5).max(50).default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { shops: [] };

      const since = new Date();
      since.setDate(since.getDate() - input.days);

      const rows = await db
        .select({
          shopId: callLogs.shopId,
          shopName: shops.name,
          totalCalls: count().as("totalCalls"),
          completedCalls: sum(
            sql`CASE WHEN ${callLogs.status} = 'completed' THEN 1 ELSE 0 END`
          ).as("completedCalls"),
          appointmentsBooked: sum(
            sql`CASE WHEN ${callLogs.appointmentBooked} = 1 THEN 1 ELSE 0 END`
          ).as("appointmentsBooked"),
          revenueEstimate: sum(callLogs.estimatedRevenue).as("revenueEstimate"),
        })
        .from(callLogs)
        .leftJoin(shops, eq(callLogs.shopId, shops.id))
        .where(gte(callLogs.createdAt, since))
        .groupBy(callLogs.shopId, shops.name)
        .orderBy(desc(sql`totalCalls`))
        .limit(input.limit);

      return {
        shops: rows.map((r) => ({
          shopId: r.shopId,
          shopName: r.shopName ?? `Shop #${r.shopId}`,
          totalCalls: Number(r.totalCalls),
          completedCalls: Number(r.completedCalls ?? 0),
          appointmentsBooked: Number(r.appointmentsBooked ?? 0),
          revenueEstimate: Number(r.revenueEstimate ?? 0),
        })),
      };
    }),

  /**
   * Conversion funnel:
   * prospects → interested → demo_scheduled → signed_up (from prospects table)
   * + users → shops → trialing → active (from users/subscriptions tables)
   */
  conversionFunnel: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      return {
        prospects: { total: 0, contacted: 0, interested: 0, demoScheduled: 0, signedUp: 0 },
        subscriptions: { totalUsers: 0, shopOwners: 0, trialing: 0, active: 0 },
      };

    // Prospect funnel
    const prospectRows = await db
      .select({
        status: prospects.outreachStatus,
        count: count().as("count"),
      })
      .from(prospects)
      .groupBy(prospects.outreachStatus);

    const prospectCounts: Record<string, number> = {};
    let prospectTotal = 0;
    for (const row of prospectRows) {
      prospectCounts[row.status] = Number(row.count);
      prospectTotal += Number(row.count);
    }

    // Subscription funnel
    const [userCount] = await db.select({ count: count() }).from(users);
    const [shopCount] = await db.select({ count: count() }).from(shops);

    const subRows = await db
      .select({
        status: subscriptions.status,
        count: count().as("count"),
      })
      .from(subscriptions)
      .groupBy(subscriptions.status);

    const subCounts: Record<string, number> = {};
    for (const row of subRows) {
      subCounts[row.status] = Number(row.count);
    }

    return {
      prospects: {
        total: prospectTotal,
        contacted:
          prospectTotal -
          (prospectCounts["not_contacted"] ?? 0),
        interested: prospectCounts["interested"] ?? 0,
        demoScheduled: prospectCounts["demo_scheduled"] ?? 0,
        signedUp: prospectCounts["signed_up"] ?? 0,
      },
      subscriptions: {
        totalUsers: Number(userCount.count),
        shopOwners: Number(shopCount.count),
        trialing: subCounts["trialing"] ?? 0,
        active: subCounts["active"] ?? 0,
      },
    };
  }),

  /**
   * Affiliate program stats: total affiliates, referrals, conversion rate.
   */
  affiliateStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      return {
        totalAffiliates: 0,
        activeAffiliates: 0,
        totalReferrals: 0,
        convertedReferrals: 0,
        conversionRate: "0.0",
        totalClicks: 0,
        totalEarningsPaid: 0,
      };

    // Affiliate counts
    const affRows = await db
      .select({
        status: affiliates.status,
        count: count().as("count"),
        clicks: sum(affiliates.totalClicks).as("clicks"),
        earnings: sum(affiliates.totalEarnings).as("earnings"),
      })
      .from(affiliates)
      .groupBy(affiliates.status);

    let totalAffiliates = 0;
    let activeAffiliates = 0;
    let totalClicks = 0;
    let totalEarningsPaid = 0;
    for (const row of affRows) {
      const cnt = Number(row.count);
      totalAffiliates += cnt;
      if (row.status === "active") activeAffiliates = cnt;
      totalClicks += Number(row.clicks ?? 0);
      totalEarningsPaid += Number(row.earnings ?? 0);
    }

    // Referral counts
    const refRows = await db
      .select({
        status: affiliateReferrals.status,
        count: count().as("count"),
      })
      .from(affiliateReferrals)
      .groupBy(affiliateReferrals.status);

    let totalReferrals = 0;
    let convertedReferrals = 0;
    for (const row of refRows) {
      const cnt = Number(row.count);
      totalReferrals += cnt;
      if (row.status === "subscribed") convertedReferrals = cnt;
    }

    const conversionRate =
      totalReferrals > 0
        ? ((convertedReferrals / totalReferrals) * 100).toFixed(1)
        : "0.0";

    return {
      totalAffiliates,
      activeAffiliates,
      totalReferrals,
      convertedReferrals,
      conversionRate,
      totalClicks,
      totalEarningsPaid,
    };
  }),
});
