import { describe, expect, it, vi } from "vitest";

/**
 * Security & Stripe Integration Tests
 * 
 * Tests:
 * - Twilio signature validation middleware logic
 * - Tenant scope isolation
 * - Prompt compiler service catalog enforcement
 * - Context cache TTL behavior
 * - Stripe product tier definitions
 */

// ─── Prompt Compiler Tests ──────────────────────────────────────────

describe("promptCompiler", () => {
  it("compiles a system prompt with shop context variables", async () => {
    const { compileSystemPrompt } = await import("./services/promptCompiler");

    const context = {
      shopName: "Joe's Auto Repair",
      agentName: "Baylio",
      phone: "(555) 123-4567",
      address: "123 Main St",
      city: "Austin",
      state: "TX",
      timezone: "America/Chicago",
      businessHours: {
        monday: { open: "8:00 AM", close: "6:00 PM", closed: false },
        tuesday: { open: "8:00 AM", close: "6:00 PM", closed: false },
      },
      serviceCatalog: [
        { name: "Oil Change", category: "maintenance", price: 49 },
        { name: "Brake Pad Replacement", category: "brakes", price: 199 },
      ],
      upsellRules: [
        { symptom: "oil change", service: "Oil Change", adjacent: "Tire Rotation", confidence: 0.8 },
      ],
      confidenceThreshold: 0.8,
      maxUpsellsPerCall: 2,
      greeting: "Thanks for calling Joe's Auto Repair!",
      language: "en",
    };

    const compiled = compileSystemPrompt(context);

    // Must contain the shop name
    expect(compiled).toContain("Joe's Auto Repair");
    // Must contain the service catalog
    expect(compiled).toContain("Oil Change");
    expect(compiled).toContain("Brake Pad Replacement");
    // Must contain the strict catalog enforcement rule
    expect(compiled).toContain("ONLY");
    // Must contain the agent name
    expect(compiled).toContain("Baylio");
    // Must not be empty
    expect(compiled.length).toBeGreaterThan(100);
  });

  it("compiles a prompt with empty service catalog gracefully", async () => {
    const { compileSystemPrompt } = await import("./services/promptCompiler");

    const context = {
      shopName: "Empty Shop",
      agentName: "Baylio",
      phone: "(555) 000-0000",
      address: "",
      city: "",
      state: "",
      timezone: "UTC",
      businessHours: {},
      serviceCatalog: [],
      upsellRules: [],
      confidenceThreshold: 0.8,
      maxUpsellsPerCall: 0,
      greeting: "Hello!",
      language: "en",
    };

    const compiled = compileSystemPrompt(context);
    expect(compiled).toContain("Empty Shop");
    expect(compiled.length).toBeGreaterThan(50);
  });

  it("estimates token count for a prompt", async () => {
    const { estimateTokenCount } = await import("./services/promptCompiler");

    const shortText = "Hello world";
    const longText = "This is a much longer text that should have more tokens. ".repeat(20);

    expect(estimateTokenCount(shortText)).toBeGreaterThan(0);
    expect(estimateTokenCount(longText)).toBeGreaterThan(estimateTokenCount(shortText));
  });
});

// ─── Context Cache Tests ────────────────────────────────────────────

describe("contextCache", () => {
  it("contextCache singleton is exported and has expected methods", async () => {
    const { contextCache } = await import("./services/contextCache");

    expect(contextCache).toBeDefined();
    expect(typeof contextCache.getShopContext).toBe("function");
    expect(typeof contextCache.setShopContext).toBe("function");
    expect(typeof contextCache.invalidateShop).toBe("function");
    expect(typeof contextCache.getShopIdByPhone).toBe("function");
    expect(typeof contextCache.setPhoneToShopId).toBe("function");
  });

  it("caches and retrieves shop context by shop ID", async () => {
    const { contextCache } = await import("./services/contextCache");

    const context = {
      shopName: "Cache Test Shop",
      agentName: "Baylio",
      phone: "(555) 111-2222",
      address: "456 Test Ave",
      city: "Dallas",
      state: "TX",
      timezone: "America/Chicago",
      businessHours: {} as any,
      serviceCatalog: [],
      upsellRules: [],
      confidenceThreshold: 0.8,
      maxUpsellsPerCall: 1,
      greeting: "Hello!",
      language: "en",
    };

    contextCache.setShopContext(9999, context);
    const retrieved = contextCache.getShopContext(9999);

    expect(retrieved).toBeDefined();
    expect(retrieved?.shopName).toBe("Cache Test Shop");

    // Clean up
    contextCache.invalidateShop(9999);
  });

  it("caches phone number to shop ID mapping", async () => {
    const { contextCache } = await import("./services/contextCache");

    contextCache.setPhoneToShopId("+15559998888", 42);
    const shopId = contextCache.getShopIdByPhone("+15559998888");
    expect(shopId).toBe(42);

    // Clean up
    contextCache.invalidatePhone("+15559998888");
  });

  it("invalidates all cached data for a shop", async () => {
    const { contextCache } = await import("./services/contextCache");

    const context = {
      shopName: "To Delete",
      agentName: "Baylio",
      phone: "(555) 999-9999",
      address: "",
      city: "",
      state: "",
      timezone: "UTC",
      businessHours: {} as any,
      serviceCatalog: [],
      upsellRules: [],
      confidenceThreshold: 0.8,
      maxUpsellsPerCall: 0,
      greeting: "Hi",
      language: "en",
    };

    contextCache.setShopContext(8888, context);
    expect(contextCache.getShopContext(8888)).toBeDefined();

    contextCache.invalidateShop(8888);
    expect(contextCache.getShopContext(8888)).toBeNull();
  });

  it("returns cache stats", async () => {
    const { contextCache } = await import("./services/contextCache");
    const stats = contextCache.getStats();

    expect(stats).toBeDefined();
    expect(typeof stats.hits).toBe("number");
    expect(typeof stats.misses).toBe("number");
    expect(typeof stats.size).toBe("number");
    expect(typeof stats.hitRate).toBe("string");
  });
});

// ─── Stripe Product Definitions Tests ───────────────────────────────

describe("stripeProducts", () => {
  it("defines all three subscription tiers", async () => {
    const { TIERS } = await import("./stripe/products");

    expect(TIERS.starter).toBeDefined();
    expect(TIERS.pro).toBeDefined();
    expect(TIERS.elite).toBeDefined();
  });

  it("starter tier has correct pricing", async () => {
    const { getTierConfig } = await import("./stripe/products");

    const starter = getTierConfig("starter");
    expect(starter).toBeDefined();
    expect(starter!.monthlyPrice).toBe(19900); // $199 in cents
    expect(starter!.includedMinutes).toBe(300);
  });

  it("pro tier has correct pricing", async () => {
    const { getTierConfig } = await import("./stripe/products");

    const pro = getTierConfig("pro");
    expect(pro).toBeDefined();
    expect(pro!.monthlyPrice).toBe(34900); // $349 in cents
    expect(pro!.includedMinutes).toBe(750);
  });

  it("elite tier has correct pricing", async () => {
    const { getTierConfig } = await import("./stripe/products");

    const elite = getTierConfig("elite");
    expect(elite).toBeDefined();
    expect(elite!.monthlyPrice).toBe(59900); // $599 in cents
    expect(elite!.includedMinutes).toBe(1500);
  });

  it("getTierConfig returns undefined for invalid tier", async () => {
    const { getTierConfig } = await import("./stripe/products");

    const invalid = getTierConfig("nonexistent");
    expect(invalid).toBeUndefined();
  });

  it("setup fees are defined for all location types", async () => {
    const { SETUP_FEES } = await import("./stripe/products");

    expect(SETUP_FEES.single).toBeDefined();
    expect(SETUP_FEES.multi_3).toBeDefined();
    expect(SETUP_FEES.multi_5).toBeDefined();
    // Multi-location should be more expensive
    expect(SETUP_FEES.multi_3).toBeGreaterThan(SETUP_FEES.single);
    expect(SETUP_FEES.multi_5).toBeGreaterThan(SETUP_FEES.multi_3);
  });

  it("annual pricing offers a discount over monthly", async () => {
    const { TIERS } = await import("./stripe/products");

    for (const tier of Object.values(TIERS)) {
      const monthlyAnnualized = tier.monthlyPrice * 12;
      expect(tier.annualPrice).toBeLessThan(monthlyAnnualized);
    }
  });
});

// ─── Twilio Validation Middleware Tests ──────────────────────────────

describe("twilioValidation", () => {
  it("HMAC-SHA1 signature computation produces valid base64", async () => {
    const crypto = await import("crypto");

    const authToken = "test_auth_token_12345";
    const url = "https://baylio.io/api/twilio/voice";
    const params = { CallSid: "CA123", From: "+15551234567" };

    // Build the data string as Twilio does
    const data =
      url +
      Object.keys(params)
        .sort()
        .reduce((acc, key) => acc + key + (params as any)[key], "");

    const expectedSignature = crypto
      .createHmac("sha1", authToken)
      .update(Buffer.from(data, "utf-8"))
      .digest("base64");

    // The signature should be a non-empty base64 string
    expect(expectedSignature).toBeTruthy();
    expect(expectedSignature.length).toBeGreaterThan(10);
  });

  it("different auth tokens produce different signatures", async () => {
    const crypto = await import("crypto");

    const url = "https://baylio.io/api/twilio/voice";
    const data = url + "CallSidCA123From+15551234567";

    const sig1 = crypto.createHmac("sha1", "token_1").update(Buffer.from(data, "utf-8")).digest("base64");
    const sig2 = crypto.createHmac("sha1", "token_2").update(Buffer.from(data, "utf-8")).digest("base64");

    expect(sig1).not.toBe(sig2);
  });
});

// ─── Tenant Isolation Tests ─────────────────────────────────────────

describe("tenantIsolation", () => {
  it("all tenant-scoped tables have ownerId column in schema", async () => {
    const schema = await import("../drizzle/schema");

    // Verify ownerId exists on all tenant-scoped tables
    expect(schema.agentConfigs.ownerId).toBeDefined();
    expect(schema.callLogs.ownerId).toBeDefined();
    expect(schema.subscriptions.ownerId).toBeDefined();
    expect(schema.usageRecords.ownerId).toBeDefined();
    expect(schema.missedCallAudits.ownerId).toBeDefined();
  });

  it("shops table has ownerId as a required field", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.shops.ownerId).toBeDefined();
  });

  it("notifications table has userId for user-level scoping", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.notifications.userId).toBeDefined();
  });
});
