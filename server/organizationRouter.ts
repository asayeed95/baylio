import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createOrganization,
  getOrganizationsByOwner,
  getShopsByOwner,
} from "./db";

/**
 * Organization Router
 *
 * Manages multi-location grouping so one account can manage
 * multiple shop locations under a single organization.
 *
 * Use cases:
 * - A franchise owner with 5 locations
 * - A regional chain wanting consolidated billing
 * - A management company overseeing multiple independent shops
 */
export const organizationRouter = router({
  /**
   * List all organizations owned by the current user.
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return getOrganizationsByOwner(ctx.user.id);
  }),

  /**
   * Create a new organization.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createOrganization({
        ownerId: ctx.user.id,
        name: input.name,
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

    const grouped = orgs.map(org => ({
      organization: org,
      shops: allShops.filter(s => s.organizationId === org.id),
    }));

    const standalone = allShops.filter(s => !s.organizationId);

    return { grouped, standalone };
  }),
});
