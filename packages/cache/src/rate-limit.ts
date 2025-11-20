import { rateLimitCache } from './cache';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Timestamp when limit resets
}

/**
 * Rate limiter using sliding window algorithm
 */
export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check and consume rate limit
   */
  async consume(identifier: string): Promise<RateLimitResult> {
    const key = `${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get current count
    const currentCount = await rateLimitCache.get<number>(key) || 0;

    // Calculate reset time
    const ttl = await rateLimitCache.ttl(key);
    const reset = ttl > 0 ? now + (ttl * 1000) : now + this.config.windowMs;

    // Check if limit exceeded
    if (currentCount >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        reset,
      };
    }

    // Increment count
    const newCount = await rateLimitCache.increment(key);

    // Set expiry if first request in window
    if (newCount === 1) {
      await rateLimitCache.expire(key, Math.ceil(this.config.windowMs / 1000));
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.config.maxRequests - newCount),
      reset: now + this.config.windowMs,
    };
  }

  /**
   * Get current rate limit status
   */
  async getStatus(identifier: string): Promise<RateLimitResult> {
    const key = `${identifier}`;
    const now = Date.now();

    const currentCount = await rateLimitCache.get<number>(key) || 0;
    const ttl = await rateLimitCache.ttl(key);
    const reset = ttl > 0 ? now + (ttl * 1000) : now + this.config.windowMs;

    return {
      allowed: currentCount < this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - currentCount),
      reset,
    };
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(identifier: string): Promise<void> {
    await rateLimitCache.delete(identifier);
  }
}

// Pre-configured rate limiters
export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts
});

export const searchRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
});

export const aiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
});

export const downloadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
});
