import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createShop,
  getShopsByOwner,
  getShopById,
  updateShop,
  deleteShop,
  getAgentConfigByShop,
  upsertAgentConfig,
  getSubscriptionByShop,
} from "./db";

const shopInput = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  timezone: z.string().default("America/New_York"),
  organizationId: z.number().optional(),
  businessHours: z.any().optional(),
  serviceCatalog: z.array(z.object({
    name: z.string(),
    category: z.string(),
    price: z.number().optional(),
    description: z.string().optional(),
  })).optional(),
});

const agentConfigInput = z.object({
  shopId: z.number(),
  voiceId: z.string().optional(),
  voiceName: z.string().optional(),
  agentName: z.string().default("Baylio"),
  systemPrompt: z.string().optional(),
  greeting: z.string().optional(),
  upsellEnabled: z.boolean().default(true),
  upsellRules: z.array(z.object({
    symptom: z.string(),
    service: z.string(),
    adjacent: z.string(),
    confidence: z.number(),
  })).optional(),
  confidenceThreshold: z.string().default("0.80"),
  maxUpsellsPerCall: z.number().default(1),
  language: z.string().default("en"),
});

export const shopRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getShopsByOwner(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.id);
      if (!shop || shop.ownerId !== ctx.user.id) {
        return null;
      }
      return shop;
    }),

  create: protectedProcedure
    .input(shopInput)
    .mutation(async ({ ctx, input }) => {
      const id = await createShop({ ...input, ownerId: ctx.user.id });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: shopInput.partial() }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.id);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new Error("Shop not found or unauthorized");
      }
      await updateShop(input.id, input.data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.id);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new Error("Shop not found or unauthorized");
      }
      await deleteShop(input.id);
      return { success: true };
    }),

  // Agent config
  getAgentConfig: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return null;
      return getAgentConfigByShop(input.shopId);
    }),

  saveAgentConfig: protectedProcedure
    .input(agentConfigInput)
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new Error("Shop not found or unauthorized");
      }
      const id = await upsertAgentConfig(input);
      return { id };
    }),

  // Subscription info
  getSubscription: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return null;
      return getSubscriptionByShop(input.shopId);
    }),
});
