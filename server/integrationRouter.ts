/**
 * Integration Router
 * Manages third-party integrations for shops.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb, getShopById } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { shopIntegrations, integrationSyncLogs } from "../drizzle/schema";

export const integrationRouter = router({
  /** List all active integrations for a shop */
  listConnected: protectedProcedure
    .input(z.object({ shopId: z.number() }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return [];

      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(shopIntegrations)
        .where(and(eq(shopIntegrations.shopId, input.shopId), eq(shopIntegrations.isActive, true)));
    }),

  /** Disconnect an integration */
  disconnect: protectedProcedure
    .input(z.object({ integrationId: z.number(), shopId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(shopIntegrations)
        .set({ isActive: false })
        .where(eq(shopIntegrations.id, input.integrationId));

      return { success: true };
    }),

  /** Save integration settings (API keys, calendar ID, sheet ID, etc.) */
  saveSettings: protectedProcedure
    .input(z.object({
      shopId: z.number(),
      provider: z.enum(["google_calendar", "google_sheets", "shopmonkey", "tekmetric", "hubspot"]),
      settings: z.record(z.string(), z.unknown()).optional(),
      accessToken: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shop not found" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .insert(shopIntegrations)
        .values({
          shopId: input.shopId,
          provider: input.provider,
          settings: input.settings || {},
          accessToken: input.accessToken || null,
          isActive: true,
        })
        .onDuplicateKeyUpdate({
          set: {
            settings: input.settings || {},
            ...(input.accessToken ? { accessToken: input.accessToken } : {}),
            isActive: true,
          },
        });

      return { success: true };
    }),

  /** Get recent sync logs for a shop */
  getSyncLogs: protectedProcedure
    .input(z.object({ shopId: z.number(), limit: z.number().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const shop = await getShopById(input.shopId);
      if (!shop || shop.ownerId !== ctx.user.id) return [];

      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(integrationSyncLogs)
        .where(eq(integrationSyncLogs.shopId, input.shopId))
        .orderBy(desc(integrationSyncLogs.createdAt))
        .limit(input.limit);
    }),
});
