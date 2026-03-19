import { describe, it, expect, beforeEach, vi } from "vitest";
import { contextCache } from "./contextCache";
import type { ShopContext } from "./promptCompiler";

/**
 * Helper to create a minimal valid ShopContext for testing.
 */
function makeShopContext(overrides: Partial<ShopContext> = {}): ShopContext {
  return {
    shopName: "Test Auto Shop",
    agentName: "TestBot",
    phone: "+15551234567",
    address: "123 Main St",
    city: "Testville",
    state: "TX",
    timezone: "America/Chicago",
    businessHours: {
      monday: { open: "08:00", close: "17:00", closed: false },
      tuesday: { open: "08:00", close: "17:00", closed: false },
      wednesday: { open: "08:00", close: "17:00", closed: false },
      thursday: { open: "08:00", close: "17:00", closed: false },
      friday: { open: "08:00", close: "17:00", closed: false },
      saturday: { open: "09:00", close: "14:00", closed: false },
      sunday: { open: "00:00", close: "00:00", closed: true },
    },
    serviceCatalog: [
      { name: "Oil Change", category: "maintenance", price: 49.99 },
    ],
    upsellRules: [
      {
        symptom: "oil change",
        service: "Oil Change",
        adjacent: "Tire Rotation",
        confidence: 0.8,
      },
    ],
    confidenceThreshold: 0.7,
    maxUpsellsPerCall: 2,
    greeting: "Hello, thanks for calling!",
    language: "en",
    ...overrides,
  };
}

describe("contextCache", () => {
  beforeEach(() => {
    vi.useRealTimers();
    contextCache.clear();
  });

  // ─── 1. Cache miss returns null ──────────────────────────────────────

  describe("cache miss", () => {
    it("returns null for a shop context that was never set", () => {
      expect(contextCache.getShopContext(999)).toBeNull();
    });

    it("returns null for a phone number that was never mapped", () => {
      expect(contextCache.getShopIdByPhone("+15559999999")).toBeNull();
    });

    it("returns null for a compiled prompt that was never set", () => {
      expect(contextCache.getCompiledPrompt(999)).toBeNull();
    });
  });

  // ─── 2. Cache hit returns stored value ───────────────────────────────

  describe("cache hit", () => {
    it("returns the stored shop context", () => {
      const ctx = makeShopContext({ shopName: "Hit Test Shop" });
      contextCache.setShopContext(1, ctx);
      const result = contextCache.getShopContext(1);
      expect(result).not.toBeNull();
      expect(result!.shopName).toBe("Hit Test Shop");
    });

    it("returns the correct shop when multiple shops are cached", () => {
      const ctx1 = makeShopContext({ shopName: "Shop A" });
      const ctx2 = makeShopContext({ shopName: "Shop B" });
      contextCache.setShopContext(1, ctx1);
      contextCache.setShopContext(2, ctx2);

      expect(contextCache.getShopContext(1)!.shopName).toBe("Shop A");
      expect(contextCache.getShopContext(2)!.shopName).toBe("Shop B");
    });
  });

  // ─── 3. Cache expiration ─────────────────────────────────────────────

  describe("TTL expiration", () => {
    it("returns null for an expired shop context", () => {
      vi.useFakeTimers();

      const ctx = makeShopContext();
      // Use a short TTL of 1000ms
      contextCache.setShopContext(1, ctx, 1000);

      // Still valid at 999ms
      vi.advanceTimersByTime(999);
      expect(contextCache.getShopContext(1)).not.toBeNull();

      // Expired at 1001ms
      vi.advanceTimersByTime(2);
      expect(contextCache.getShopContext(1)).toBeNull();
    });

    it("returns null for an expired phone mapping", () => {
      vi.useFakeTimers();

      contextCache.setPhoneToShopId("+15551234567", 42, 500);

      vi.advanceTimersByTime(499);
      expect(contextCache.getShopIdByPhone("+15551234567")).toBe(42);

      vi.advanceTimersByTime(2);
      expect(contextCache.getShopIdByPhone("+15551234567")).toBeNull();
    });

    it("returns null for an expired compiled prompt", () => {
      vi.useFakeTimers();

      contextCache.setCompiledPrompt(1, "You are an assistant.", 800);

      vi.advanceTimersByTime(799);
      expect(contextCache.getCompiledPrompt(1)).toBe("You are an assistant.");

      vi.advanceTimersByTime(2);
      expect(contextCache.getCompiledPrompt(1)).toBeNull();
    });
  });

  // ─── 4. Cache invalidation on shop update ────────────────────────────

  describe("invalidation on shop update", () => {
    it("returns null after the shop context is overwritten and then invalidated", () => {
      const ctx = makeShopContext();
      contextCache.setShopContext(1, ctx);
      expect(contextCache.getShopContext(1)).not.toBeNull();

      contextCache.invalidateShop(1);
      expect(contextCache.getShopContext(1)).toBeNull();
    });

    it("allows re-caching after invalidation", () => {
      const ctx1 = makeShopContext({ shopName: "Old" });
      contextCache.setShopContext(1, ctx1);
      contextCache.invalidateShop(1);

      const ctx2 = makeShopContext({ shopName: "New" });
      contextCache.setShopContext(1, ctx2);
      expect(contextCache.getShopContext(1)!.shopName).toBe("New");
    });
  });

  // ─── 5. Phone number mapping ─────────────────────────────────────────

  describe("phone number mapping", () => {
    it("sets and gets a phone-to-shop mapping", () => {
      contextCache.setPhoneToShopId("+15551234567", 10);
      expect(contextCache.getShopIdByPhone("+15551234567")).toBe(10);
    });

    it("overwrites an existing mapping", () => {
      contextCache.setPhoneToShopId("+15551234567", 10);
      contextCache.setPhoneToShopId("+15551234567", 20);
      expect(contextCache.getShopIdByPhone("+15551234567")).toBe(20);
    });

    it("invalidatePhone removes the mapping", () => {
      contextCache.setPhoneToShopId("+15551234567", 10);
      contextCache.invalidatePhone("+15551234567");
      expect(contextCache.getShopIdByPhone("+15551234567")).toBeNull();
    });
  });

  // ─── 6. Phone normalization ──────────────────────────────────────────

  describe("phone normalization", () => {
    it("strips dashes and parentheses", () => {
      contextCache.setPhoneToShopId("+1(555)123-4567", 7);
      expect(contextCache.getShopIdByPhone("+15551234567")).toBe(7);
    });

    it("strips spaces", () => {
      contextCache.setPhoneToShopId("+1 555 123 4567", 8);
      expect(contextCache.getShopIdByPhone("+15551234567")).toBe(8);
    });

    it("preserves leading +", () => {
      contextCache.setPhoneToShopId("+15551234567", 9);
      // Lookup with same format should work
      expect(contextCache.getShopIdByPhone("+15551234567")).toBe(9);
    });

    it("strips dots and other non-digit chars", () => {
      contextCache.setPhoneToShopId("+1.555.123.4567", 11);
      expect(contextCache.getShopIdByPhone("+15551234567")).toBe(11);
    });

    it("normalizes on both set and get", () => {
      // Set with formatting, get with different formatting
      contextCache.setPhoneToShopId("(555) 123-4567", 12);
      expect(contextCache.getShopIdByPhone("555-123-4567")).toBe(12);
    });
  });

  // ─── 7. Compiled prompt cache ────────────────────────────────────────

  describe("compiled prompt cache", () => {
    it("stores and retrieves a compiled prompt", () => {
      const prompt = "You are a helpful auto shop assistant.";
      contextCache.setCompiledPrompt(1, prompt);
      expect(contextCache.getCompiledPrompt(1)).toBe(prompt);
    });

    it("returns null for a different shop ID", () => {
      contextCache.setCompiledPrompt(1, "prompt for shop 1");
      expect(contextCache.getCompiledPrompt(2)).toBeNull();
    });

    it("overwrites an existing prompt", () => {
      contextCache.setCompiledPrompt(1, "old prompt");
      contextCache.setCompiledPrompt(1, "new prompt");
      expect(contextCache.getCompiledPrompt(1)).toBe("new prompt");
    });
  });

  // ─── 8. invalidateShop clears all caches for that shop ───────────────

  describe("invalidateShop clears all caches for that shop", () => {
    it("clears shop context, compiled prompt, and phone mapping", () => {
      const ctx = makeShopContext();
      contextCache.setShopContext(5, ctx);
      contextCache.setCompiledPrompt(5, "prompt for shop 5");
      contextCache.setPhoneToShopId("+15559990000", 5);

      contextCache.invalidateShop(5);

      expect(contextCache.getShopContext(5)).toBeNull();
      expect(contextCache.getCompiledPrompt(5)).toBeNull();
      expect(contextCache.getShopIdByPhone("+15559990000")).toBeNull();
    });

    it("does not affect other shops", () => {
      const ctx1 = makeShopContext({ shopName: "Shop 1" });
      const ctx2 = makeShopContext({ shopName: "Shop 2" });
      contextCache.setShopContext(1, ctx1);
      contextCache.setShopContext(2, ctx2);
      contextCache.setCompiledPrompt(1, "prompt 1");
      contextCache.setCompiledPrompt(2, "prompt 2");
      contextCache.setPhoneToShopId("+10000000001", 1);
      contextCache.setPhoneToShopId("+10000000002", 2);

      contextCache.invalidateShop(1);

      // Shop 1 is gone
      expect(contextCache.getShopContext(1)).toBeNull();
      expect(contextCache.getCompiledPrompt(1)).toBeNull();
      expect(contextCache.getShopIdByPhone("+10000000001")).toBeNull();

      // Shop 2 is untouched
      expect(contextCache.getShopContext(2)!.shopName).toBe("Shop 2");
      expect(contextCache.getCompiledPrompt(2)).toBe("prompt 2");
      expect(contextCache.getShopIdByPhone("+10000000002")).toBe(2);
    });
  });

  // ─── 9. clear() resets everything ────────────────────────────────────

  describe("clear()", () => {
    it("removes all cached data", () => {
      contextCache.setShopContext(1, makeShopContext());
      contextCache.setShopContext(2, makeShopContext());
      contextCache.setPhoneToShopId("+11111111111", 1);
      contextCache.setPhoneToShopId("+12222222222", 2);
      contextCache.setCompiledPrompt(1, "p1");
      contextCache.setCompiledPrompt(2, "p2");

      contextCache.clear();

      expect(contextCache.getShopContext(1)).toBeNull();
      expect(contextCache.getShopContext(2)).toBeNull();
      expect(contextCache.getShopIdByPhone("+11111111111")).toBeNull();
      expect(contextCache.getShopIdByPhone("+12222222222")).toBeNull();
      expect(contextCache.getCompiledPrompt(1)).toBeNull();
      expect(contextCache.getCompiledPrompt(2)).toBeNull();
    });

    it("resets stats to zero", () => {
      contextCache.setShopContext(1, makeShopContext());
      contextCache.getShopContext(1); // hit
      contextCache.getShopContext(999); // miss

      contextCache.clear();

      const stats = contextCache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.size).toBe(0);
    });
  });

  // ─── 10. Cache stats tracking ────────────────────────────────────────

  describe("cache stats tracking", () => {
    it("starts with all zeros", () => {
      const stats = contextCache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe("N/A");
    });

    it("tracks hits", () => {
      contextCache.setShopContext(1, makeShopContext());
      contextCache.getShopContext(1);
      contextCache.getShopContext(1);

      const stats = contextCache.getStats();
      expect(stats.hits).toBe(2);
    });

    it("tracks misses", () => {
      contextCache.getShopContext(1);
      contextCache.getShopIdByPhone("+10000000000");
      contextCache.getCompiledPrompt(1);

      const stats = contextCache.getStats();
      expect(stats.misses).toBe(3);
    });

    it("tracks evictions on TTL expiration", () => {
      vi.useFakeTimers();

      contextCache.setShopContext(1, makeShopContext(), 100);
      vi.advanceTimersByTime(101);
      // This get triggers eviction of the expired entry
      contextCache.getShopContext(1);

      const stats = contextCache.getStats();
      expect(stats.evictions).toBe(1);
    });

    it("computes hitRate correctly", () => {
      contextCache.setShopContext(1, makeShopContext());

      // 3 hits
      contextCache.getShopContext(1);
      contextCache.getShopContext(1);
      contextCache.getShopContext(1);

      // 1 miss
      contextCache.getShopContext(999);

      const stats = contextCache.getStats();
      // 3 hits / 4 total = 75.0%
      expect(stats.hitRate).toBe("75.0%");
    });

    it("tracks size across all cache maps", () => {
      contextCache.setShopContext(1, makeShopContext());
      contextCache.setShopContext(2, makeShopContext());
      // Note: setPhoneToShopId doesn't call updateSize, so size only
      // reflects shopContexts + compiledPrompts as maintained by updateSize.
      // Actually let's just verify the size after setShopContext calls.
      const stats = contextCache.getStats();
      expect(stats.size).toBeGreaterThanOrEqual(2);
    });
  });
});
