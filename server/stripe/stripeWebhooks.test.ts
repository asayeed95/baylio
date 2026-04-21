/**
 * Stripe Webhook Handler Tests
 *
 * Covers LOOP-014 gap #2: the five Stripe webhook event handlers — the only
 * code that flips a shop from "signed up" to "paying customer" in the DB.
 *
 * Verifies:
 *   1. handleCheckoutCompleted — setup fee marks setupFeePaid=true
 *   2. handleCheckoutCompleted — additional_shop inserts subscription
 *   3. handleCheckoutCompleted — missing metadata short-circuits (warn + return)
 *   4. handleCheckoutCompleted — new subscription insert with tier config
 *   5. handleCheckoutCompleted — existing subscription update (tier change path)
 *   6. handleInvoicePaid — resets usedMinutes to 0, sets period dates
 *   7. handleInvoicePaid — no subscription id → no-op
 *   8. handlePaymentFailed — sets status=past_due
 *   9. handleSubscriptionUpdated — maps Stripe status → internal status
 *  10. handleSubscriptionDeleted — sets status=canceled
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type Stripe from "stripe";

// ─── Module-level mocks ─────────────────────────────────────────────
// We mock the db plumbing (postgres + drizzle) so the handlers run against
// a fake fluent builder. The builder records every call so tests can assert
// which table got which write.

const state = vi.hoisted(() => {
  const calls: Array<{ op: string; args: any[] }> = [];
  const selectResults: any[][] = [];
  const makeDb = () => {
    const db: any = {
      _calls: calls,
      select() {
        calls.push({ op: "select", args: [] });
        return {
          from(table: any) {
            calls.push({ op: "from", args: [table] });
            return {
              where(cond: any) {
                calls.push({ op: "where", args: [cond] });
                return {
                  limit(n: number) {
                    calls.push({ op: "limit", args: [n] });
                    const next = selectResults.shift() ?? [];
                    return Promise.resolve(next);
                  },
                };
              },
            };
          },
        };
      },
      update(table: any) {
        calls.push({ op: "update", args: [table] });
        return {
          set(values: any) {
            calls.push({ op: "set", args: [values] });
            return {
              where(cond: any) {
                calls.push({ op: "where", args: [cond] });
                return Promise.resolve();
              },
            };
          },
        };
      },
      insert(table: any) {
        calls.push({ op: "insert", args: [table] });
        return {
          values(vals: any) {
            calls.push({ op: "values", args: [vals] });
            return Promise.resolve();
          },
        };
      },
    };
    return db;
  };
  return { calls, selectResults, makeDb };
});

vi.mock("postgres", () => ({
  default: () => ({}),
}));

vi.mock("drizzle-orm/postgres-js", () => ({
  drizzle: () => state.makeDb(),
}));

vi.mock("posthog-node", () => ({
  PostHog: class {
    capture() {}
    shutdown() {
      return Promise.resolve();
    }
  },
}));

// Import AFTER mocks are registered
import {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handlePaymentFailed,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from "./stripeRoutes";

beforeEach(() => {
  state.calls.length = 0;
  state.selectResults.length = 0;
  process.env.DATABASE_URL = "postgres://test";
});

// Helpers ─────────────────────────────────────────────────────────────

function findOp(op: string) {
  return state.calls.find((c) => c.op === op);
}

function findAllOps(op: string) {
  return state.calls.filter((c) => c.op === op);
}

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_1",
    customer: "cus_test_1",
    subscription: "sub_test_1",
    metadata: {},
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

// ─── handleCheckoutCompleted ─────────────────────────────────────────

describe("handleCheckoutCompleted", () => {
  it("marks setupFeePaid=true when metadata.type === 'setup_fee'", async () => {
    await handleCheckoutCompleted(
      makeSession({
        metadata: { type: "setup_fee", shop_id: "42" } as any,
      })
    );
    const setCall = findOp("set");
    expect(setCall).toBeTruthy();
    expect(setCall!.args[0]).toEqual({ setupFeePaid: true });
    // Must NOT have inserted a new subscription
    expect(findOp("insert")).toBeUndefined();
  });

  it("short-circuits when metadata is missing user_id/shop_id/tier", async () => {
    await handleCheckoutCompleted(
      makeSession({ metadata: { random: "data" } as any })
    );
    // No writes of any kind
    expect(findOp("update")).toBeUndefined();
    expect(findOp("insert")).toBeUndefined();
  });

  it("inserts a new subscription when none exists for the shop (Pro tier)", async () => {
    state.selectResults.push([]); // no existing subs
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          user_id: "7",
          shop_id: "42",
          tier: "pro",
        } as any,
      })
    );
    const insertCall = findOp("insert");
    expect(insertCall).toBeTruthy();
    const valuesCall = findOp("values");
    expect(valuesCall!.args[0]).toMatchObject({
      shopId: 42,
      ownerId: 7,
      tier: "pro",
      status: "active",
      stripeCustomerId: "cus_test_1",
      stripeSubscriptionId: "sub_test_1",
      includedMinutes: 750,
      usedMinutes: 0,
    });
  });

  it("updates an existing subscription (tier change) without inserting", async () => {
    state.selectResults.push([{ id: 1, shopId: 42, tier: "starter" }]);
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          user_id: "7",
          shop_id: "42",
          tier: "elite",
        } as any,
      })
    );
    expect(findOp("insert")).toBeUndefined();
    const setCall = findOp("set");
    expect(setCall!.args[0]).toMatchObject({
      tier: "elite",
      status: "active",
      includedMinutes: 1500,
    });
  });

  it("handles additional_shop metadata path (inserts new sub with ADDITIONAL_SHOP_MINUTES=300)", async () => {
    state.selectResults.push([]); // no existing sub
    await handleCheckoutCompleted(
      makeSession({
        metadata: {
          type: "additional_shop",
          user_id: "7",
          shop_id: "99",
        } as any,
      })
    );
    const valuesCall = findOp("values");
    expect(valuesCall!.args[0]).toMatchObject({
      shopId: 99,
      ownerId: 7,
      tier: "starter",
      status: "active",
      includedMinutes: 300,
    });
  });
});

// ─── handleInvoicePaid ───────────────────────────────────────────────

describe("handleInvoicePaid", () => {
  it("resets usedMinutes to 0 and records period dates when subscription found", async () => {
    state.selectResults.push([{ id: 1, stripeSubscriptionId: "sub_1" }]);
    const periodStart = 1_700_000_000;
    const periodEnd = 1_702_000_000;
    await handleInvoicePaid({
      subscription: "sub_1",
      period_start: periodStart,
      period_end: periodEnd,
    } as any);
    const setCall = findOp("set");
    expect(setCall!.args[0]).toMatchObject({ status: "active", usedMinutes: 0 });
    expect(setCall!.args[0].currentPeriodStart).toEqual(new Date(periodStart * 1000));
    expect(setCall!.args[0].currentPeriodEnd).toEqual(new Date(periodEnd * 1000));
  });

  it("no-ops when no subscription id is present on the invoice", async () => {
    await handleInvoicePaid({} as any);
    // Handler returns before any select/update
    expect(findOp("update")).toBeUndefined();
    expect(findOp("select")).toBeUndefined();
  });

  it("reads nested parent.subscription_details.subscription (v2025 API shape)", async () => {
    state.selectResults.push([{ id: 1, stripeSubscriptionId: "sub_nested" }]);
    await handleInvoicePaid({
      parent: {
        subscription_details: { subscription: "sub_nested" },
      },
      period: { start: 1_000_000, end: 2_000_000 },
    } as any);
    expect(findOp("set")).toBeTruthy();
  });
});

// ─── handlePaymentFailed ─────────────────────────────────────────────

describe("handlePaymentFailed", () => {
  it("sets status=past_due on the matching subscription", async () => {
    state.selectResults.push([{ id: 1, ownerId: 7, shopId: 42 }]);
    await handlePaymentFailed({ subscription: "sub_1" } as any);
    const setCall = findOp("set");
    expect(setCall!.args[0]).toEqual({ status: "past_due" });
  });

  it("no-ops when no subscription id is present", async () => {
    await handlePaymentFailed({} as any);
    expect(findOp("update")).toBeUndefined();
  });
});

// ─── handleSubscriptionUpdated ───────────────────────────────────────

describe("handleSubscriptionUpdated", () => {
  it("maps Stripe 'active' to internal 'active'", async () => {
    await handleSubscriptionUpdated({
      id: "sub_1",
      status: "active",
      current_period_start: 1_700_000_000,
      current_period_end: 1_702_000_000,
    } as any);
    const setCall = findOp("set");
    expect(setCall!.args[0].status).toBe("active");
  });

  it("maps Stripe 'past_due' to internal 'past_due'", async () => {
    await handleSubscriptionUpdated({
      id: "sub_2",
      status: "past_due",
    } as any);
    const setCall = findOp("set");
    expect(setCall!.args[0].status).toBe("past_due");
  });

  it("maps Stripe 'canceled' to internal 'canceled'", async () => {
    await handleSubscriptionUpdated({
      id: "sub_3",
      status: "canceled",
    } as any);
    const setCall = findOp("set");
    expect(setCall!.args[0].status).toBe("canceled");
  });

  it("maps Stripe 'trialing' to internal 'trialing'", async () => {
    await handleSubscriptionUpdated({
      id: "sub_4",
      status: "trialing",
    } as any);
    const setCall = findOp("set");
    expect(setCall!.args[0].status).toBe("trialing");
  });

  it("falls back to 'active' for unknown statuses", async () => {
    await handleSubscriptionUpdated({
      id: "sub_5",
      status: "paused" as any,
    } as any);
    const setCall = findOp("set");
    expect(setCall!.args[0].status).toBe("active");
  });
});

// ─── handleSubscriptionDeleted ───────────────────────────────────────

describe("handleSubscriptionDeleted", () => {
  it("sets status=canceled on the matching subscription", async () => {
    state.selectResults.push([{ id: 1, ownerId: 7, shopId: 42, tier: "pro" }]);
    await handleSubscriptionDeleted({ id: "sub_del_1" } as any);
    const setCalls = findAllOps("set");
    expect(setCalls.length).toBeGreaterThan(0);
    expect(setCalls[0].args[0]).toEqual({ status: "canceled" });
  });
});
