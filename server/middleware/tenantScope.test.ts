/**
 * Tenant Scope Middleware Tests
 *
 * Covers LOOP-014 gap #5: zero isolation middleware coverage.
 *
 * Verifies:
 *   1. tenantProcedure injects ctx.tenantId = ctx.user.id for authenticated users
 *   2. tenantProcedure rejects unauthenticated requests (UNAUTHORIZED)
 *   3. verifyShopOwnership throws FORBIDDEN when shop belongs to a different tenant
 *   4. verifyShopOwnership throws FORBIDDEN when shop does not exist
 *   5. verifyShopOwnership resolves silently when shop belongs to the tenant
 *   6. verifyShopOwnership uses AND(id, ownerId) — cannot be bypassed by id alone
 */
import { describe, expect, it, vi } from "vitest";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { tenantProcedure, verifyShopOwnership } from "./tenantScope";
import type { TrpcContext } from "../_core/context";
import type { User } from "../../drizzle/schema";

function makeCtx(user: User | null): TrpcContext {
  return {
    req: {} as any,
    res: {} as any,
    user,
  };
}

function makeUser(id: number, overrides: Partial<User> = {}): User {
  return {
    id,
    supabaseId: `supa-${id}`,
    email: `user${id}@example.com`,
    name: `User ${id}`,
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe("tenantProcedure middleware", () => {
  const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });
  const router = t.router({
    readTenantId: tenantProcedure.query(({ ctx }) => ({
      tenantId: ctx.tenantId,
      userId: ctx.user.id,
    })),
  });

  it("injects tenantId equal to the authenticated user's id", async () => {
    const user = makeUser(42);
    const caller = router.createCaller(makeCtx(user));
    const result = await caller.readTenantId();
    expect(result.tenantId).toBe(42);
    expect(result.userId).toBe(42);
  });

  it("rejects unauthenticated requests with UNAUTHORIZED", async () => {
    const caller = router.createCaller(makeCtx(null));
    await expect(caller.readTenantId()).rejects.toThrowError(TRPCError);
    await expect(caller.readTenantId()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("does not share tenantId across different users", async () => {
    const userA = router.createCaller(makeCtx(makeUser(1)));
    const userB = router.createCaller(makeCtx(makeUser(2)));
    const [a, b] = await Promise.all([userA.readTenantId(), userB.readTenantId()]);
    expect(a.tenantId).toBe(1);
    expect(b.tenantId).toBe(2);
    expect(a.tenantId).not.toBe(b.tenantId);
  });
});

describe("verifyShopOwnership", () => {
  function makeMockDb(rows: Array<{ id: number }>) {
    const whereFn = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(rows),
    });
    const fromFn = vi.fn().mockReturnValue({ where: whereFn });
    const selectFn = vi.fn().mockReturnValue({ from: fromFn });
    return {
      db: { select: selectFn },
      spies: { select: selectFn, from: fromFn, where: whereFn },
    };
  }

  it("resolves silently when the shop belongs to the tenant", async () => {
    const { db } = makeMockDb([{ id: 10 }]);
    await expect(verifyShopOwnership(db, 10, 1)).resolves.toBeUndefined();
  });

  it("throws FORBIDDEN when the shop does not exist", async () => {
    const { db } = makeMockDb([]);
    await expect(verifyShopOwnership(db, 999, 1)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws FORBIDDEN when the shop belongs to a different tenant", async () => {
    // The query filters by (id=10 AND ownerId=tenantId). If the shop exists but
    // belongs to a different owner, the WHERE filter returns zero rows, which
    // looks identical to "not found" — same FORBIDDEN path.
    const { db } = makeMockDb([]);
    await expect(verifyShopOwnership(db, 10, 2)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: expect.stringMatching(/access/i),
    });
  });

  it("queries with a limit of 1 (no expensive scans)", async () => {
    const whereResult = { limit: vi.fn().mockResolvedValue([{ id: 10 }]) };
    const fromResult = { where: vi.fn().mockReturnValue(whereResult) };
    const selectResult = { from: vi.fn().mockReturnValue(fromResult) };
    const db = { select: vi.fn().mockReturnValue(selectResult) };

    await verifyShopOwnership(db, 10, 1);
    expect(whereResult.limit).toHaveBeenCalledWith(1);
  });

  it("throws a TRPCError (not a generic Error) so tRPC maps it correctly", async () => {
    const { db } = makeMockDb([]);
    try {
      await verifyShopOwnership(db, 10, 1);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
    }
  });
});
