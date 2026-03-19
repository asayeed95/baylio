/**
 * Hot Context Cache
 * 
 * In-memory cache for shop configurations used during live call routing.
 * This is Layer 1 of the 3-Layer Architecture — the real-time call path
 * must NEVER hit the database during a live webhook. Instead, shop context
 * is pre-loaded and cached here.
 * 
 * Cache strategy:
 * - TTL-based expiration (default 5 minutes)
 * - Lazy loading on first request per shop
 * - Manual invalidation when shop config changes
 * - Phone number → shop ID lookup for Twilio routing
 * 
 * Performance target: <5ms cache hit (vs ~50-100ms DB query)
 */

import type { ShopContext } from "./promptCompiler";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500; // Max shops in cache

class ContextCache {
  /** Shop ID → compiled context */
  private shopContexts: Map<number, CacheEntry<ShopContext>> = new Map();

  /** Twilio phone number → shop ID (for webhook routing) */
  private phoneToShopId: Map<string, CacheEntry<number>> = new Map();

  /** Compiled system prompts (expensive to regenerate) */
  private compiledPrompts: Map<number, CacheEntry<string>> = new Map();

  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };

  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  // ─── Shop Context Cache ─────────────────────────────────────────────

  /**
   * Get cached shop context by shop ID.
   * Returns null if not cached or expired.
   */
  getShopContext(shopId: number): ShopContext | null {
    const entry = this.shopContexts.get(shopId);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.shopContexts.delete(shopId);
        this.stats.evictions++;
      }
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Cache a shop context.
   */
  setShopContext(shopId: number, context: ShopContext, ttlMs?: number): void {
    this.enforceMaxSize(this.shopContexts);
    const now = Date.now();
    this.shopContexts.set(shopId, {
      data: context,
      expiresAt: now + (ttlMs || this.ttlMs),
      createdAt: now,
    });
    this.updateSize();
  }

  // ─── Phone Number Routing Cache ─────────────────────────────────────

  /**
   * Get shop ID by Twilio phone number.
   * This is the critical lookup for inbound call routing.
   */
  getShopIdByPhone(phoneNumber: string): number | null {
    const normalized = this.normalizePhone(phoneNumber);
    const entry = this.phoneToShopId.get(normalized);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.phoneToShopId.delete(normalized);
        this.stats.evictions++;
      }
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Cache a phone number → shop ID mapping.
   */
  setPhoneToShopId(phoneNumber: string, shopId: number, ttlMs?: number): void {
    const normalized = this.normalizePhone(phoneNumber);
    const now = Date.now();
    this.phoneToShopId.set(normalized, {
      data: shopId,
      expiresAt: now + (ttlMs || this.ttlMs),
      createdAt: now,
    });
  }

  // ─── Compiled Prompt Cache ──────────────────────────────────────────

  /**
   * Get a cached compiled prompt for a shop.
   */
  getCompiledPrompt(shopId: number): string | null {
    const entry = this.compiledPrompts.get(shopId);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) {
        this.compiledPrompts.delete(shopId);
        this.stats.evictions++;
      }
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Cache a compiled prompt.
   */
  setCompiledPrompt(shopId: number, prompt: string, ttlMs?: number): void {
    this.enforceMaxSize(this.compiledPrompts);
    const now = Date.now();
    this.compiledPrompts.set(shopId, {
      data: prompt,
      expiresAt: now + (ttlMs || this.ttlMs),
      createdAt: now,
    });
  }

  // ─── Invalidation ──────────────────────────────────────────────────

  /**
   * Invalidate all cached data for a shop.
   * Call this when shop config, agent config, or service catalog changes.
   */
  invalidateShop(shopId: number): void {
    this.shopContexts.delete(shopId);
    this.compiledPrompts.delete(shopId);
    // Also remove phone mapping if it points to this shop
    for (const [phone, entry] of Array.from(this.phoneToShopId)) {
      if (entry.data === shopId) {
        this.phoneToShopId.delete(phone);
      }
    }
    this.updateSize();
  }

  /**
   * Invalidate a specific phone number mapping.
   */
  invalidatePhone(phoneNumber: string): void {
    this.phoneToShopId.delete(this.normalizePhone(phoneNumber));
  }

  /**
   * Clear all caches.
   */
  clear(): void {
    this.shopContexts.clear();
    this.phoneToShopId.clear();
    this.compiledPrompts.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, size: 0 };
  }

  // ─── Stats & Monitoring ─────────────────────────────────────────────

  /**
   * Get cache statistics for monitoring.
   */
  getStats(): CacheStats & { hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) + "%" : "N/A";
    return { ...this.stats, hitRate };
  }

  // ─── Internal Helpers ───────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    // Strip everything except digits and leading +
    return phone.replace(/[^\d+]/g, "");
  }

  private enforceMaxSize<K, T>(cache: Map<K, CacheEntry<T>>): void {
    if (cache.size >= MAX_CACHE_SIZE) {
      // Evict oldest entry
      let oldestKey: K | null = null;
      let oldestTime = Infinity;
      for (const [key, entry] of Array.from(cache)) {
        if (entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt;
          oldestKey = key;
        }
      }
      if (oldestKey !== null) {
        cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }
  }

  private updateSize(): void {
    this.stats.size = this.shopContexts.size + this.phoneToShopId.size + this.compiledPrompts.size;
  }
}

/** Singleton cache instance */
export const contextCache = new ContextCache();

export type { ShopContext, CacheStats };
