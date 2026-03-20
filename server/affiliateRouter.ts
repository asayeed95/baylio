/**
 * Affiliate Portal Router
 * 
 * Handles affiliate signup, referral tracking, commission management,
 * and admin operations for the Baylio affiliate program.
 * 
 * Commission model: 20% recurring monthly on referred shop subscriptions.
 * Affiliates get a unique referral code/link. When a shop signs up via
 * that link and subscribes, the affiliate earns commission each billing cycle.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  createAffiliate,
  getAffiliateByUserId,
  getAffiliateByCode,
  getAffiliateById,
  updateAffiliate,
  listAffiliates,
  incrementAffiliateClicks,
  createAffiliateReferral,
  getReferralsByAffiliate,
  getCommissionsByAffiliate,
  getPendingCommissionTotal,
} from "./db";
import crypto from "crypto";

/** Generate a unique, URL-safe referral code. */
function generateReferralCode(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const rand = crypto.randomBytes(3).toString("hex");
  return `${slug}-${rand}`;
}

/** Admin guard: only admin users can access these procedures. */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const affiliateRouter = router({
  // ─── Public: Track a referral click ─────────────────────────────────
  trackClick: publicProcedure
    .input(z.object({ code: z.string().min(1).max(32) }))
    .mutation(async ({ input }) => {
      const affiliate = await getAffiliateByCode(input.code);
      if (!affiliate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invalid referral code" });
      }
      if (affiliate.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Affiliate is not active" });
      }
      await incrementAffiliateClicks(affiliate.id);
      return { success: true, affiliateId: affiliate.id };
    }),

  // ─── Public: Validate a referral code ───────────────────────────────
  validateCode: publicProcedure
    .input(z.object({ code: z.string().min(1).max(32) }))
    .query(async ({ input }) => {
      const affiliate = await getAffiliateByCode(input.code);
      if (!affiliate || affiliate.status !== "active") {
        return { valid: false, name: null };
      }
      return { valid: true, name: affiliate.name };
    }),

   // ─── Protected: Sign up to become an affiliate ──────────────────
  signup: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      email: z.string().email().max(320),
      phone: z.string().max(32).optional(),
      paypalEmail: z.string().email().max(320).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user already has an affiliate account
      const existing = await getAffiliateByUserId(ctx.user.id);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have an affiliate account",
        });
      }

      const code = generateReferralCode(input.name);
      const id = await createAffiliate({
        userId: ctx.user.id,
        code,
        name: input.name,
        email: input.email,
        phone: input.phone,
        paypalEmail: input.paypalEmail,
        status: "pending", // Admin must approve
      });

      return { id, code };
    }),

  // ─── Protected: Get my affiliate profile ────────────────────────────
  me: protectedProcedure.query(async ({ ctx }) => {
    const affiliate = await getAffiliateByUserId(ctx.user.id);
    if (!affiliate) return null;
    return affiliate;
  }),

  // ─── Protected: Get my dashboard stats ──────────────────────────────
  stats: protectedProcedure.query(async ({ ctx }) => {
    const affiliate = await getAffiliateByUserId(ctx.user.id);
    if (!affiliate) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Affiliate account not found" });
    }

    const referrals = await getReferralsByAffiliate(affiliate.id);
    const commissions = await getCommissionsByAffiliate(affiliate.id);
    const pendingPayout = await getPendingCommissionTotal(affiliate.id);

    const activeShops = referrals.filter(r => r.status === "subscribed").length;
    const totalReferred = referrals.filter(r => r.status !== "clicked").length;

    return {
      affiliate,
      referrals,
      commissions,
      summary: {
        totalClicks: affiliate.totalClicks,
        totalSignups: affiliate.totalSignups,
        totalReferred,
        activeShops,
        totalEarnings: affiliate.totalEarnings,
        pendingPayout,
        commissionRate: affiliate.commissionRate,
        conversionRate: affiliate.totalClicks > 0
          ? ((totalReferred / affiliate.totalClicks) * 100).toFixed(1)
          : "0.0",
      },
    };
  }),

  // ─── Protected: Get my referral link ────────────────────────────────
  getLink: protectedProcedure.query(async ({ ctx }) => {
    const affiliate = await getAffiliateByUserId(ctx.user.id);
    if (!affiliate) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Affiliate account not found" });
    }
    return { code: affiliate.code };
  }),

  // ─── Protected: Update my payout info ───────────────────────────────
  updatePayoutInfo: protectedProcedure
    .input(z.object({
      paypalEmail: z.string().email().max(320).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const affiliate = await getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Affiliate account not found" });
      }
      await updateAffiliate(affiliate.id, { paypalEmail: input.paypalEmail });
      return { success: true };
    }),

  // ─── Protected: Create a referral (when affiliate shares with someone) ──
  createReferral: protectedProcedure
    .input(z.object({
      referredEmail: z.string().email().max(320),
      referredName: z.string().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const affiliate = await getAffiliateByUserId(ctx.user.id);
      if (!affiliate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Affiliate account not found" });
      }
      if (affiliate.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Affiliate account is not active" });
      }

      const id = await createAffiliateReferral({
        affiliateId: affiliate.id,
        referredEmail: input.referredEmail,
        referredName: input.referredName,
        status: "clicked",
      });

      return { id };
    }),

  // ═══════════════════════════════════════════════════════════════════
  // ADMIN PROCEDURES
  // ═══════════════════════════════════════════════════════════════════

  // ─── Admin: List all affiliates ─────────────────────────────────────
  adminList: adminProcedure.query(async () => {
    return listAffiliates();
  }),

  // ─── Admin: Approve or suspend an affiliate ─────────────────────────
  adminUpdateStatus: adminProcedure
    .input(z.object({
      affiliateId: z.number(),
      status: z.enum(["active", "suspended", "inactive"]),
    }))
    .mutation(async ({ input }) => {
      const affiliate = await getAffiliateById(input.affiliateId);
      if (!affiliate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Affiliate not found" });
      }
      await updateAffiliate(input.affiliateId, { status: input.status });
      return { success: true };
    }),

  // ─── Admin: Update commission rate for an affiliate ─────────────────
  adminUpdateRate: adminProcedure
    .input(z.object({
      affiliateId: z.number(),
      commissionRate: z.string().regex(/^\d+\.\d{4}$/, "Must be decimal like 0.2000"),
    }))
    .mutation(async ({ input }) => {
      const affiliate = await getAffiliateById(input.affiliateId);
      if (!affiliate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Affiliate not found" });
      }
      await updateAffiliate(input.affiliateId, { commissionRate: input.commissionRate });
      return { success: true };
    }),

  // ─── Admin: View affiliate details with referrals and commissions ───
  adminDetail: adminProcedure
    .input(z.object({ affiliateId: z.number() }))
    .query(async ({ input }) => {
      const affiliate = await getAffiliateById(input.affiliateId);
      if (!affiliate) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Affiliate not found" });
      }
      const referrals = await getReferralsByAffiliate(affiliate.id);
      const commissions = await getCommissionsByAffiliate(affiliate.id);
      return { affiliate, referrals, commissions };
    }),
});
