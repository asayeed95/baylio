/**
 * Tenant Scope Middleware for tRPC
 * 
 * Provides application-level Row-Level Security for MySQL/TiDB.
 * Since MySQL does not support native RLS policies, this middleware
 * injects the authenticated user's ID as ctx.tenantId into every
 * protected procedure, ensuring all downstream queries are scoped.
 * 
 * Architecture:
 * - tenantProcedure: extends protectedProcedure with ctx.tenantId
 * - All query helpers in db.ts MUST accept ownerId parameter
 */
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";

/**
 * Procedure that requires authentication AND injects tenantId.
 * Use this for ALL shop-owner-facing operations.
 * 
 * Usage in routers:
 *   myProcedure: tenantProcedure.query(({ ctx }) => {
 *     // ctx.tenantId is guaranteed to be the authenticated user's ID
 *     return db.getShopsByOwner(ctx.tenantId);
 *   })
 */
export const tenantProcedure = protectedProcedure.use(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required for tenant-scoped operations",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.user.id,
    },
  });
});

/**
 * Verify that a shop belongs to the authenticated tenant.
 * Use this as a guard before any shop-specific operation.
 * 
 * Throws FORBIDDEN if the shop doesn't belong to the tenant.
 */
export async function verifyShopOwnership(
  db: any,
  shopId: number,
  tenantId: number
): Promise<void> {
  const { eq, and } = await import("drizzle-orm");
  const { shops } = await import("../../drizzle/schema");

  const result = await db
    .select({ id: shops.id })
    .from(shops)
    .where(and(eq(shops.id, shopId), eq(shops.ownerId, tenantId)))
    .limit(1);

  if (result.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this shop",
    });
  }
}
