import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────

// Mock stripe module
const mockConstructEvent = vi.fn();
const mockStripeInstance = {
  webhooks: {
    constructEvent: mockConstructEvent,
  },
};
vi.mock("stripe", () => {
  return {
    default: vi.fn(() => mockStripeInstance),
  };
});

// Mock drizzle-orm
const mockEq = vi.fn((_col: unknown, _val: unknown) => "mock-where-clause");
vi.mock("drizzle-orm", () => ({
  eq: (...args: unknown[]) => mockEq(...args),
}));

// Mock drizzle-orm/mysql2
const mockSet = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockResolvedValue([]);
const mockLimit = vi.fn().mockResolvedValue([]);
const mockFrom = vi.fn(() => ({ where: vi.fn(() => ({ limit: mockLimit })) }));
const mockValues = vi.fn().mockResolvedValue([]);
const mockDb = {
  select: vi.fn(() => ({ from: mockFrom })),
  insert: vi.fn(() => ({ values: mockValues })),
  update: vi.fn(() => ({ set: mockSet })),
};
// Make set().where() work
mockSet.mockReturnValue({ where: mockWhere });

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => mockDb),
}));

// Mock schema - only needs subscriptions export
vi.mock("../../drizzle/schema", () => ({
  subscriptions: {
    shopId: "shopId",
    stripeSubscriptionId: "stripeSubscriptionId",
  },
}));

// Mock products
vi.mock("./products", () => ({
  getTierConfig: vi.fn((tier: string) => {
    const tiers: Record<string, { id: string; includedMinutes: number }> = {
      starter: { id: "starter", includedMinutes: 300 },
      pro: { id: "pro", includedMinutes: 750 },
      elite: { id: "elite", includedMinutes: 1500 },
    };
    return tiers[tier] ?? undefined;
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────

function createMockReq(body: Buffer | string = Buffer.from("{}"), sig = "valid_sig") {
  return {
    body,
    headers: {
      "stripe-signature": sig,
      "content-type": "application/json",
    },
  } as unknown as import("express").Request;
}

function createMockRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as unknown as import("express").Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe("stripeWebhookRouter POST /webhook", () => {
  let handler: (req: import("express").Request, res: import("express").Response) => Promise<unknown>;

  beforeEach(async () => {
    vi.resetModules();

    // Set required env vars
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_key";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
    process.env.DATABASE_URL = "mysql://test:test@localhost/test";

    // Re-import to pick up fresh mocks each time
    // We need to extract the route handler from the router.
    // The router is created at module scope, so we access it via the exported router.
    const mod = await import("./stripeRoutes");
    const router = (mod as Record<string, unknown>).stripeWebhookRouter as import("express").Router;

    // Extract the POST /webhook handler from the router's stack.
    // Express routers store routes in router.stack as Layer objects.
    const stack = (router as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> }>).stack;
    const webhookLayer = stack.find(
      (layer) => layer.route?.path === "/webhook" && layer.route?.methods?.post
    );

    // The route stack has the middleware (express.raw) at index 0 and the handler at index 1
    const routeStack = webhookLayer!.route!.stack;
    handler = routeStack[routeStack.length - 1].handle as typeof handler;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.DATABASE_URL;
  });

  // ── 1. Valid signature accepted ──────────────────────────────────

  it("accepts a valid webhook signature and returns { received: true }", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_live_abc123",
      type: "some.unknown.event",
      data: { object: {} },
    });

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    expect(mockConstructEvent).toHaveBeenCalledWith(
      req.body,
      "valid_sig",
      "whsec_test_secret"
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  // ── 2. Invalid signature rejected with 400 ──────────────────────

  it("rejects an invalid webhook signature with 400", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = createMockReq(Buffer.from("tampered"), "bad_sig");
    const res = createMockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid signature" });
  });

  // ── 3. Test event returns { verified: true } ────────────────────

  it("returns { verified: true } for test events (evt_test_*)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_test_webhook_verification",
      type: "checkout.session.completed",
      data: { object: {} },
    });

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({ verified: true });
  });

  // ── 4. checkout.session.completed creates/updates subscription ──

  it("creates a new subscription on checkout.session.completed with valid metadata", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_live_checkout_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          customer: "cus_test_abc",
          subscription: "sub_test_xyz",
          metadata: {
            user_id: "42",
            shop_id: "7",
            tier: "pro",
          },
        },
      },
    });

    // No existing subscription found
    mockLimit.mockResolvedValueOnce([]);

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: 7,
        ownerId: 42,
        tier: "pro",
        status: "active",
        stripeCustomerId: "cus_test_abc",
        stripeSubscriptionId: "sub_test_xyz",
        includedMinutes: 750,
        usedMinutes: 0,
      })
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it("updates an existing subscription on checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_live_checkout_2",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_456",
          customer: "cus_test_def",
          subscription: "sub_test_uvw",
          metadata: {
            user_id: "10",
            shop_id: "3",
            tier: "starter",
          },
        },
      },
    });

    // Existing subscription found
    mockFrom.mockReturnValueOnce({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValueOnce([{ id: 1, shopId: 3, tier: "starter" }]),
      })),
    });

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    expect(mockDb.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: "starter",
        status: "active",
        stripeCustomerId: "cus_test_def",
        stripeSubscriptionId: "sub_test_uvw",
        includedMinutes: 300,
      })
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  // ── 5. Unknown event type handled gracefully ────────────────────

  it("handles unknown event types gracefully and returns { received: true }", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_live_unknown_1",
      type: "payment_intent.created",
      data: { object: {} },
    });

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    // Should not throw, should return received: true
    expect(res.json).toHaveBeenCalledWith({ received: true });
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── 6. Missing STRIPE_WEBHOOK_SECRET returns 500 ────────────────

  it("returns 500 when STRIPE_WEBHOOK_SECRET is not set", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const req = createMockReq();
    const res = createMockRes();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Webhook secret not configured" });
  });
});
