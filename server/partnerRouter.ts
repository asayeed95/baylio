import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  partners,
  referrals,
  partnerPayouts,
  users,
  shops,
  subscriptions,
} from "../drizzle/schema";
import { nanoid } from "nanoid";

/**
 * Partner Portal Router
 *
 * Handles all partner/affiliate operations:
 * - Dashboard stats
 * - Referral tracking
 * - Earnings & payouts
 * - Network (referred shops + sub-partners)
 * - Settings management
 */
export const partnerRouter = router({
  /**
   * Get or create the current user's partner profile.
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const result = await db
      .select()
      .from(partners)
      .where(eq(partners.userId, ctx.user.id))
      .limit(1);

    return result[0] || null;
  }),

  /**
   * Enroll the current user as a partner.
   */
  enroll: protectedProcedure
    .input(
      z.object({
        companyName: z.string().max(255).optional(),
        website: z.string().max(512).optional(),
        payoutEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const existing = await db
        .select()
        .from(partners)
        .where(eq(partners.userId, ctx.user.id))
        .limit(1);

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
        status: "active",
      }).returning({ id: partners.id });

      return { id: result[0].id, referralCode };
    }),

  /**
   * Dashboard stats: totals for referrals, earnings, conversions.
   */
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database unavailable",
      });

    const partner = await db
      .select()
      .from(partners)
      .where(eq(partners.userId, ctx.user.id))
      .limit(1);

    if (partner.length === 0) return null;

    const p = partner[0];

    const referralStats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        pending: sql<number>`SUM(CASE WHEN ${referrals.status} = 'pending' THEN 1 ELSE 0 END)`,
        signedUp: sql<number>`SUM(CASE WHEN ${referrals.status} = 'signed_up' THEN 1 ELSE 0 END)`,
        subscribed: sql<number>`SUM(CASE WHEN ${referrals.status} = 'subscribed' THEN 1 ELSE 0 END)`,
        churned: sql<number>`SUM(CASE WHEN ${referrals.status} = 'churned' THEN 1 ELSE 0 END)`,
        totalCommission: sql<string>`COALESCE(SUM(${referrals.commissionEarned}), 0)`,
        totalMonthlyValue: sql<string>`COALESCE(SUM(CASE WHEN ${referrals.status} = 'subscribed' THEN ${referrals.monthlyValue} ELSE 0 END), 0)`,
      })
      .from(referrals)
      .where(eq(referrals.partnerId, p.id));

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
        conversionRate:
          (stats?.total || 0) > 0
            ? Math.round(((stats?.subscribed || 0) / (stats?.total || 1)) * 100)
            : 0,
      },
    };
  }),

  /**
   * List all referrals for the current partner.
   */
  listReferrals: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["all", "pending", "signed_up", "subscribed", "churned"])
            .default("all"),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { referrals: [], total: 0 };

      const partner = await db
        .select()
        .from(partners)
        .where(eq(partners.userId, ctx.user.id))
        .limit(1);

      if (partner.length === 0) return { referrals: [], total: 0 };

      const conditions = [eq(referrals.partnerId, partner[0].id)];
      const statusFilter = input?.status || "all";
      if (statusFilter !== "all") {
        conditions.push(eq(referrals.status, statusFilter));
      }

      const results = await db
        .select()
        .from(referrals)
        .where(and(...conditions))
        .orderBy(desc(referrals.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(referrals)
        .where(and(...conditions));

      return {
        referrals: results,
        total: countResult[0]?.count || 0,
      };
    }),

  /**
   * Get earnings breakdown.
   */
  getEarnings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const partner = await db
      .select()
      .from(partners)
      .where(eq(partners.userId, ctx.user.id))
      .limit(1);

    if (partner.length === 0) return null;

    const p = partner[0];

    // Monthly earnings for last 12 months
    const monthlyEarnings = await db
      .select({
        month: sql<string>`TO_CHAR(${referrals.createdAt}, 'YYYY-MM')`,
        earned: sql<string>`COALESCE(SUM(${referrals.commissionEarned}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(referrals)
      .where(eq(referrals.partnerId, p.id))
      .groupBy(sql`TO_CHAR(${referrals.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${referrals.createdAt}, 'YYYY-MM')`);

    // Earnings by tier
    const byTier = await db
      .select({
        tier: referrals.subscriptionTier,
        earned: sql<string>`COALESCE(SUM(${referrals.commissionEarned}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(referrals)
      .where(
        and(eq(referrals.partnerId, p.id), eq(referrals.status, "subscribed"))
      )
      .groupBy(referrals.subscriptionTier);

    return {
      totalEarnings: parseFloat(p.totalEarnings?.toString() || "0"),
      pendingEarnings: parseFloat(p.pendingEarnings?.toString() || "0"),
      commissionRate: parseFloat(p.commissionRate?.toString() || "0.20"),
      monthlyEarnings,
      byTier,
    };
  }),

  /**
   * Get the partner's referral network (shops they brought in).
   */
  getMyNetwork: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { network: [], totalMRR: 0 };

    const partner = await db
      .select()
      .from(partners)
      .where(eq(partners.userId, ctx.user.id))
      .limit(1);

    if (partner.length === 0) return { network: [], totalMRR: 0 };

    const network = await db
      .select({
        referralId: referrals.id,
        referredName: referrals.referredName,
        referredEmail: referrals.referredEmail,
        status: referrals.status,
        subscriptionTier: referrals.subscriptionTier,
        monthlyValue: referrals.monthlyValue,
        commissionEarned: referrals.commissionEarned,
        convertedAt: referrals.convertedAt,
        createdAt: referrals.createdAt,
      })
      .from(referrals)
      .where(eq(referrals.partnerId, partner[0].id))
      .orderBy(desc(referrals.createdAt));

    const totalMRR = network
      .filter(n => n.status === "subscribed")
      .reduce(
        (sum, n) => sum + parseFloat(n.monthlyValue?.toString() || "0"),
        0
      );

    return { network, totalMRR };
  }),

  /**
   * Request a payout of pending earnings.
   */
  requestPayout: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(50, "Minimum payout is $50"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const partner = await db
        .select()
        .from(partners)
        .where(eq(partners.userId, ctx.user.id))
        .limit(1);

      if (partner.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partner profile not found",
        });
      }

      const p = partner[0];
      const pending = parseFloat(p.pendingEarnings?.toString() || "0");

      if (input.amount > pending) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Requested $${input.amount} but only $${pending.toFixed(2)} available`,
        });
      }

      const result = await db.insert(partnerPayouts).values({
        partnerId: p.id,
        amount: input.amount.toFixed(2),
        payoutMethod: p.payoutMethod || "stripe",
        payoutEmail: p.payoutEmail || null,
        status: "pending",
      }).returning({ id: partnerPayouts.id });

      // Deduct from pending earnings
      await db
        .update(partners)
        .set({
          pendingEarnings: sql`${partners.pendingEarnings} - ${input.amount.toFixed(2)}`,
        })
        .where(eq(partners.id, p.id));

      return { payoutId: result[0].id, amount: input.amount };
    }),

  /**
   * Get payout history.
   */
  getMyPayouts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const partner = await db
      .select()
      .from(partners)
      .where(eq(partners.userId, ctx.user.id))
      .limit(1);

    if (partner.length === 0) return [];

    return db
      .select()
      .from(partnerPayouts)
      .where(eq(partnerPayouts.partnerId, partner[0].id))
      .orderBy(desc(partnerPayouts.requestedAt));
  }),

  /**
   * Update partner settings (payout method, notifications, profile).
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        payoutMethod: z.enum(["stripe", "paypal", "bank_transfer"]).optional(),
        payoutEmail: z.string().email().optional(),
        companyName: z.string().max(255).optional(),
        website: z.string().max(512).optional(),
        notifyReferrals: z.boolean().optional(),
        notifyPayouts: z.boolean().optional(),
        notifyNewsletter: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      const partner = await db
        .select()
        .from(partners)
        .where(eq(partners.userId, ctx.user.id))
        .limit(1);

      if (partner.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Partner profile not found",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (input.payoutMethod !== undefined)
        updateData.payoutMethod = input.payoutMethod;
      if (input.payoutEmail !== undefined)
        updateData.payoutEmail = input.payoutEmail;
      if (input.companyName !== undefined)
        updateData.companyName = input.companyName;
      if (input.website !== undefined) updateData.website = input.website;
      if (input.notifyReferrals !== undefined)
        updateData.notifyReferrals = input.notifyReferrals;
      if (input.notifyPayouts !== undefined)
        updateData.notifyPayouts = input.notifyPayouts;
      if (input.notifyNewsletter !== undefined)
        updateData.notifyNewsletter = input.notifyNewsletter;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(partners)
          .set(updateData)
          .where(eq(partners.id, partner[0].id));
      }

      return { success: true };
    }),
});
