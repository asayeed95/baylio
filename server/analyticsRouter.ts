import { z } from "zod";
import { eq, and, gte, sql, count, desc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { callLogs, subscriptions, shops } from "../drizzle/schema";

/**
 * Analytics Router
 *
 * Cost analytics and platform-level metrics.
 * All queries are scoped to the authenticated user's shops.
 */

/** Twilio per-minute rate for inbound calls */
const TWILIO_RATE_PER_MIN = 0.014;
/** ElevenLabs estimated cost per character (Turbo v2.5) */
const ELEVENLABS_RATE_PER_CHAR = 0.00011;
/** Average characters spoken per minute of call (estimated) */
const AVG_CHARS_PER_MINUTE = 600;

export const analyticsRouter = router({
  /**
   * Get cost summary across all of the user's shops.
   * Covers the current calendar month by default.
   */
  getCostSummary: protectedProcedure
    .input(
      z
        .object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      // Default to current month
      const now = new Date();
      const monthStart = input?.startDate
        ? new Date(input.startDate)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = input?.endDate
        ? new Date(input.endDate)
        : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Get user's shop IDs
      const userShops = await db
        .select({ id: shops.id })
        .from(shops)
        .where(eq(shops.ownerId, ctx.user.id));

      const shopIds = userShops.map(s => s.id);
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
          recentCalls: [],
        };
      }

      // Aggregate call stats for the period
      const shopIdList = shopIds.join(",");
      const callStats = await db
        .select({
          callCount: count(),
          totalSeconds: sql<number>`COALESCE(SUM(${callLogs.duration}), 0)`,
        })
        .from(callLogs)
        .where(
          and(
            sql`${callLogs.shopId} IN (${sql.raw(shopIdList)})`,
            gte(callLogs.createdAt, monthStart)
          )
        );

      const stats = callStats[0];
      const callCount = stats?.callCount || 0;
      const totalSeconds = stats?.totalSeconds || 0;
      const totalMinutes = Math.ceil(totalSeconds / 60);

      // Cost estimates
      const twilioCost = totalMinutes * TWILIO_RATE_PER_MIN;
      const elevenLabsCost =
        totalMinutes * AVG_CHARS_PER_MINUTE * ELEVENLABS_RATE_PER_CHAR;
      const totalCost = twilioCost + elevenLabsCost;
      const costPerCall = callCount > 0 ? totalCost / callCount : 0;

      // Revenue: sum of active subscription prices
      const TIER_PRICES: Record<string, number> = {
        starter: 199,
        pro: 349,
        elite: 599,
      };

      const activeSubs = await db
        .select({ tier: subscriptions.tier })
        .from(subscriptions)
        .where(
          and(
            sql`${subscriptions.shopId} IN (${sql.raw(shopIdList)})`,
            eq(subscriptions.status, "active")
          )
        );

      const revenue = activeSubs.reduce(
        (sum, s) => sum + (TIER_PRICES[s.tier] || 0),
        0
      );
      const grossMargin =
        revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;

      // Daily call volume for the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyCalls = await db
        .select({
          date: sql<string>`DATE(${callLogs.createdAt})`,
          count: count(),
        })
        .from(callLogs)
        .where(
          and(
            sql`${callLogs.shopId} IN (${sql.raw(shopIdList)})`,
            gte(callLogs.createdAt, thirtyDaysAgo)
          )
        )
        .groupBy(sql`DATE(${callLogs.createdAt})`)
        .orderBy(sql`DATE(${callLogs.createdAt})`);

      // 10 most recent calls
      const recentCalls = await db
        .select({
          id: callLogs.id,
          callerPhone: callLogs.callerPhone,
          duration: callLogs.duration,
          status: callLogs.status,
          createdAt: callLogs.createdAt,
        })
        .from(callLogs)
        .where(sql`${callLogs.shopId} IN (${sql.raw(shopIdList)})`)
        .orderBy(desc(callLogs.createdAt))
        .limit(10);

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
        recentCalls,
      };
    }),
});
