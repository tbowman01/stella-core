import redis from './client';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

/**
 * Cache utility class for Redis operations
 */
export class Cache {
  private prefix: string;

  constructor(prefix: string = 'arcqubit') {
    this.prefix = prefix;
  }

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await redis.get(this.buildKey(key));
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as T;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    const cacheKey = this.buildKey(key);

    if (ttl) {
      await redis.setex(cacheKey, ttl, serialized);
    } else {
      await redis.set(cacheKey, serialized);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<void> {
    await redis.del(this.buildKey(key));
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const cacheKeys = keys.map((k) => this.buildKey(k));
    await redis.del(...cacheKeys);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(this.buildKey(key));
    return result === 1;
  }

  /**
   * Get TTL for key
   */
  async ttl(key: string): Promise<number> {
    return await redis.ttl(this.buildKey(key));
  }

  /**
   * Extend TTL for key
   */
  async expire(key: string, ttl: number): Promise<void> {
    await redis.expire(this.buildKey(key), ttl);
  }

  /**
   * Increment value
   */
  async increment(key: string, by: number = 1): Promise<number> {
    return await redis.incrby(this.buildKey(key), by);
  }

  /**
   * Decrement value
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    return await redis.decrby(this.buildKey(key), by);
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Generate value
    const value = await factory();

    // Store in cache
    await this.set(key, value, ttl);

    return value;
  }

  /**
   * Invalidate pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(this.buildKey(pattern));
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    const cacheKeys = keys.map((k) => this.buildKey(k));
    const values = await redis.mget(...cacheKeys);

    return values.map((v) => {
      if (!v) return null;
      try {
        return JSON.parse(v);
      } catch {
        return v as T;
      }
    });
  }

  /**
   * Set multiple keys
   */
  async mset(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    const pipeline = redis.pipeline();

    for (const entry of entries) {
      const serialized = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value);
      const cacheKey = this.buildKey(entry.key);

      if (entry.ttl) {
        pipeline.setex(cacheKey, entry.ttl, serialized);
      } else {
        pipeline.set(cacheKey, serialized);
      }
    }

    await pipeline.exec();
  }

  /**
   * Clear all keys with prefix
   */
  async clear(): Promise<void> {
    await this.invalidatePattern('*');
  }
}

// Create cache instances for different purposes
export const sessionCache = new Cache('session');
export const searchCache = new Cache('search');
export const aiCache = new Cache('ai');
export const userCache = new Cache('user');
export const workspaceCache = new Cache('workspace');
export const rateLimitCache = new Cache('ratelimit');

// Export default cache instance
export default new Cache('arcqubit');
