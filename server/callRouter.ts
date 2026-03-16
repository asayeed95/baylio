import { z } from "zod";
import { protectedProcedure, adminProcedure, router } from "./_core/trpc";
import {
  getCallLogsByShop,
  getCallLogCountByShop,
  getShopAnalytics,
  getShopById,
  getMissedCallAudits,
  createMissedCallAudit,
  updateMissedCallAudit,
} from "./db";

export const callRouter = router({
  list: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return { calls: [], total: 0 };
      const calls = await getCallLogsByShop(input.shopId, {
        limit: input.limit,
        offset: input.offset,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        status: input.status,
      });
      const total = await getCallLogCountByShop(input.shopId);
      return { calls, total };
    }),

  analytics: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return null;
      return getShopAnalytics(
        input.shopId,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined,
      );
    }),

  // Missed call audits
  audits: protectedProcedure
    .input(z.object({ shopId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.shopId) {
        const shop = await getShopById(input.shopId);
        if (!shop || shop.ownerId !== ctx.user.id) return [];
      }
      return getMissedCallAudits(input.shopId);
    }),

  createAudit: protectedProcedure
    .input(z.object({
      shopId: z.number().optional(),
      prospectName: z.string().optional(),
      prospectEmail: z.string().optional(),
      prospectPhone: z.string().optional(),
      shopName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await createMissedCallAudit(input);
      return { id };
    }),

  updateAudit: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        status: z.enum(["pending", "active", "completed", "expired"]).optional(),
        totalMissedCalls: z.number().optional(),
        estimatedLostRevenue: z.string().optional(),
        scorecardData: z.any().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await updateMissedCallAudit(input.id, input.data as any);
      return { success: true };
    }),
});
