/**
 * LLM Response Cache Implementation
 * Provides caching and throttling for LLM requests
 */

import * as crypto from 'crypto';

interface CacheEntry {
  response: string;
  timestamp: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ThrottleEntry {
  count: number;
  resetTime: number;
}

/**
 * LLM Cache with TTL and throttling support
 */
export class LLMCache {
  private cache = new Map<string, CacheEntry>();
  private throttle = new Map<string, ThrottleEntry>();
  private readonly ttl: number;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(
    ttlSeconds: number = 3600,
    maxRequestsPerMinute: number = 60,
    windowMs: number = 60000
  ) {
    this.ttl = ttlSeconds * 1000;
    this.maxRequests = maxRequestsPerMinute;
    this.windowMs = windowMs;

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate cache key for prompt and config
   */
  private generateKey(prompt: string, provider: string, model: string): string {
    const content = `${provider}:${model}:${prompt}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if request is throttled
   */
  isThrottled(provider: string): boolean {
    const now = Date.now();
    const key = `throttle:${provider}`;
    const entry = this.throttle.get(key);

    if (!entry || now > entry.resetTime) {
      this.throttle.set(key, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    if (entry.count >= this.maxRequests) {
      return true;
    }

    entry.count++;
    return false;
  }

  /**
   * Get cached response if available and not expired
   */
  get(prompt: string, provider: string, model: string): CacheEntry | null {
    const key = this.generateKey(prompt, provider, model);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Store response in cache
   */
  set(
    prompt: string,
    provider: string,
    model: string,
    response: string,
    usage?: CacheEntry['usage']
  ): void {
    const key = this.generateKey(prompt, provider, model);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      usage,
    });
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }

    // Clean throttle
    for (const [key, entry] of this.throttle.entries()) {
      if (now > entry.resetTime) {
        this.throttle.delete(key);
      }
    }
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.throttle.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cacheSize: number;
    throttleEntries: number;
    hitRate?: number;
  } {
    return {
      cacheSize: this.cache.size,
      throttleEntries: this.throttle.size,
    };
  }
}
