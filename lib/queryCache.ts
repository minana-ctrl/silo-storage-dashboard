/**
 * Simple in-memory LRU cache for analytics queries
 * Caches results for 2 minutes with automatic expiration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number; // Time to live in milliseconds

  constructor(maxSize: number = 100, ttl: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Generate a cache key from date range and optional tags
   */
  generateKey(startDate: string, endDate: string, ...tags: string[]): string {
    return `${startDate}|${endDate}|${tags.join('|')}`;
  }

  /**
   * Get value from cache if it exists and hasn't expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Set value in cache
   */
  set(key: string, data: T): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add or update entry
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ttl,
    });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; ttlSeconds: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlSeconds: this.ttl / 1000,
    };
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance - 5 minute TTL for analytics data
// Analytics data changes less frequently than transactional data, so longer TTL is beneficial
const analyticsCache = new LRUCache<any>(100, 5 * 60 * 1000); // 5 minute TTL

/**
 * Get cached analytics data or null if not found/expired
 */
export function getCachedAnalytics(startDate: string, endDate: string): any | null {
  const key = analyticsCache.generateKey(startDate, endDate, 'analytics');
  return analyticsCache.get(key);
}

/**
 * Cache analytics data
 */
export function cacheAnalytics(startDate: string, endDate: string, data: any): void {
  const key = analyticsCache.generateKey(startDate, endDate, 'analytics');
  analyticsCache.set(key, data);
}

/**
 * Clear all analytics cache
 */
export function clearAnalyticsCache(): void {
  analyticsCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number; ttlSeconds: number } {
  return analyticsCache.getStats();
}

/**
 * Cleanup expired cache entries
 */
export function cleanupCache(): void {
  analyticsCache.cleanup();
}

// Periodically cleanup expired entries every 5 minutes
setInterval(() => {
  analyticsCache.cleanup();
}, 5 * 60 * 1000);

export default analyticsCache;

