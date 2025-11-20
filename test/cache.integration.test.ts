/**
 * Cache Integration Tests
 * Tests real Redis operations for caching and rate limiting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Cache, getRedisClient } from '@arcqubit/cache';
import { RateLimiter } from '@arcqubit/cache';

describe('Cache Integration Tests', () => {
  let redis: any;
  let cache: Cache;

  beforeEach(async () => {
    redis = getRedisClient();
    cache = new Cache('test');

    // Clear test Redis DB
    await redis.flushdb();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get string values', async () => {
      await cache.set('test-key', 'test-value');
      const value = await cache.get<string>('test-key');

      expect(value).toBe('test-value');
    });

    it('should set and get complex objects', async () => {
      const testObj = {
        id: '123',
        name: 'Test Object',
        nested: {
          field: 'value',
          array: [1, 2, 3],
        },
      };

      await cache.set('test-object', testObj);
      const retrieved = await cache.get<typeof testObj>('test-object');

      expect(retrieved).toEqual(testObj);
      expect(retrieved?.nested.array).toEqual([1, 2, 3]);
    });

    it('should return null for non-existent keys', async () => {
      const value = await cache.get('non-existent');
      expect(value).toBeNull();
    });

    it('should delete keys', async () => {
      await cache.set('delete-me', 'value');
      await cache.delete('delete-me');

      const value = await cache.get('delete-me');
      expect(value).toBeNull();
    });

    it('should check if key exists', async () => {
      await cache.set('exists-key', 'value');

      const exists = await cache.exists('exists-key');
      const notExists = await cache.exists('does-not-exist');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire keys after TTL', async () => {
      await cache.set('expiring-key', 'value', 1); // 1 second TTL

      const immediate = await cache.get('expiring-key');
      expect(immediate).toBe('value');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const expired = await cache.get('expiring-key');
      expect(expired).toBeNull();
    });

    it('should update TTL on set', async () => {
      await cache.set('ttl-key', 'value1', 2);

      // Update with new TTL
      await cache.set('ttl-key', 'value2', 10);

      const value = await cache.get('ttl-key');
      expect(value).toBe('value2');

      // Original 2-second TTL should not apply
      await new Promise(resolve => setTimeout(resolve, 2100));
      const stillExists = await cache.get('ttl-key');
      expect(stillExists).toBe('value2');
    });
  });

  describe('Pattern Operations', () => {
    it('should invalidate keys by pattern', async () => {
      await cache.set('user:1:profile', { name: 'User 1' });
      await cache.set('user:2:profile', { name: 'User 2' });
      await cache.set('user:3:profile', { name: 'User 3' });
      await cache.set('document:1', { title: 'Doc 1' });

      await cache.invalidatePattern('user:*');

      const user1 = await cache.get('user:1:profile');
      const user2 = await cache.get('user:2:profile');
      const doc = await cache.get('document:1');

      expect(user1).toBeNull();
      expect(user2).toBeNull();
      expect(doc).not.toBeNull(); // Document should remain
    });

    it('should handle complex patterns', async () => {
      await cache.set('tenant:abc:user:1', 'data1');
      await cache.set('tenant:abc:user:2', 'data2');
      await cache.set('tenant:xyz:user:1', 'data3');

      await cache.invalidatePattern('tenant:abc:*');

      const abc1 = await cache.get('tenant:abc:user:1');
      const xyz1 = await cache.get('tenant:xyz:user:1');

      expect(abc1).toBeNull();
      expect(xyz1).toBe('data3');
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple keys at once', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      const values = await cache.mget<string>(['key1', 'key2', 'key3']);

      expect(values).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle missing keys in mget', async () => {
      await cache.set('exists', 'value');

      const values = await cache.mget<string>(['exists', 'missing', 'also-missing']);

      expect(values).toEqual(['value', null, null]);
    });

    it('should set multiple keys at once', async () => {
      await cache.mset([
        { key: 'batch1', value: 'value1', ttl: 60 },
        { key: 'batch2', value: 'value2', ttl: 120 },
        { key: 'batch3', value: { complex: 'object' } },
      ]);

      const val1 = await cache.get<string>('batch1');
      const val2 = await cache.get<string>('batch2');
      const val3 = await cache.get<any>('batch3');

      expect(val1).toBe('value1');
      expect(val2).toBe('value2');
      expect(val3).toEqual({ complex: 'object' });
    });
  });

  describe('Cache-Aside Pattern', () => {
    it('should call factory and cache result on miss', async () => {
      let factoryCalls = 0;

      const factory = async () => {
        factoryCalls++;
        return { data: 'expensive result', computed: Date.now() };
      };

      const result1 = await cache.getOrSet('factory-key', factory, 10);
      expect(factoryCalls).toBe(1);
      expect(result1.data).toBe('expensive result');

      const result2 = await cache.getOrSet('factory-key', factory, 10);
      expect(factoryCalls).toBe(1); // Factory not called again
      expect(result2).toEqual(result1); // Same cached result
    });

    it('should handle factory errors gracefully', async () => {
      const failingFactory = async () => {
        throw new Error('Factory error');
      };

      await expect(
        cache.getOrSet('failing-key', failingFactory)
      ).rejects.toThrow('Factory error');

      // Key should not be cached
      const exists = await cache.exists('failing-key');
      expect(exists).toBe(false);
    });
  });

  describe('Increment Operations', () => {
    it('should increment numeric values', async () => {
      await cache.set('counter', '0');

      await cache.increment('counter', 1);
      await cache.increment('counter', 5);
      await cache.increment('counter', 10);

      const value = await cache.get<string>('counter');
      expect(parseInt(value!)).toBe(16);
    });

    it('should increment from zero if key does not exist', async () => {
      await cache.increment('new-counter', 42);

      const value = await cache.get<string>('new-counter');
      expect(parseInt(value!)).toBe(42);
    });
  });
});

describe('Rate Limiter Integration Tests', () => {
  let redis: any;

  beforeEach(async () => {
    redis = getRedisClient();
    await redis.flushdb();
  });

  describe('Rate Limiting', () => {
    it('should allow requests under limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 10000,
        maxRequests: 5,
      });

      const key = 'test-user-1';

      for (let i = 0; i < 5; i++) {
        const result = await limiter.consume(key);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('should block requests over limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 10000,
        maxRequests: 3,
      });

      const key = 'test-user-2';

      // Use up the limit
      await limiter.consume(key);
      await limiter.consume(key);
      await limiter.consume(key);

      // This should be blocked
      const blocked = await limiter.consume(key);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const limiter = new RateLimiter({
        windowMs: 1000, // 1 second window
        maxRequests: 2,
      });

      const key = 'test-user-3';

      // Use up limit
      await limiter.consume(key);
      await limiter.consume(key);

      // Should be blocked
      const blocked = await limiter.consume(key);
      expect(blocked.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be allowed again
      const allowed = await limiter.consume(key);
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(1);
    });

    it('should handle multiple users independently', async () => {
      const limiter = new RateLimiter({
        windowMs: 10000,
        maxRequests: 2,
      });

      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 uses their limit
      await limiter.consume(user1);
      await limiter.consume(user1);
      const user1Blocked = await limiter.consume(user1);
      expect(user1Blocked.allowed).toBe(false);

      // User 2 should still have their full limit
      const user2First = await limiter.consume(user2);
      expect(user2First.allowed).toBe(true);
      expect(user2First.remaining).toBe(1);
    });
  });

  describe('Rate Limit Status', () => {
    it('should return current status without consuming', async () => {
      const limiter = new RateLimiter({
        windowMs: 10000,
        maxRequests: 10,
      });

      const key = 'status-user';

      await limiter.consume(key);
      await limiter.consume(key);
      await limiter.consume(key);

      const status = await limiter.getStatus(key);
      expect(status.remaining).toBe(7);
      expect(status.total).toBe(10);
      expect(status.resetAt).toBeInstanceOf(Date);

      // Consuming again should decrease remaining
      await limiter.consume(key);
      const newStatus = await limiter.getStatus(key);
      expect(newStatus.remaining).toBe(6);
    });

    it('should indicate when limit is exceeded', async () => {
      const limiter = new RateLimiter({
        windowMs: 10000,
        maxRequests: 1,
      });

      const key = 'exceeded-user';

      await limiter.consume(key);
      await limiter.consume(key); // This exceeds

      const status = await limiter.getStatus(key);
      expect(status.exceeded).toBe(true);
      expect(status.remaining).toBe(0);
    });
  });

  describe('Rate Limit Reset', () => {
    it('should manually reset rate limit', async () => {
      const limiter = new RateLimiter({
        windowMs: 10000,
        maxRequests: 2,
      });

      const key = 'reset-user';

      // Use up limit
      await limiter.consume(key);
      await limiter.consume(key);

      const blocked = await limiter.consume(key);
      expect(blocked.allowed).toBe(false);

      // Manual reset
      await limiter.reset(key);

      // Should be allowed again
      const allowed = await limiter.consume(key);
      expect(allowed.allowed).toBe(true);
      expect(allowed.remaining).toBe(1);
    });
  });

  describe('Concurrent Rate Limiting', () => {
    it('should handle concurrent requests correctly', async () => {
      const limiter = new RateLimiter({
        windowMs: 10000,
        maxRequests: 10,
      });

      const key = 'concurrent-user';

      // Make 20 concurrent requests
      const promises = Array.from({ length: 20 }, () =>
        limiter.consume(key)
      );

      const results = await Promise.all(promises);

      const allowed = results.filter(r => r.allowed).length;
      const blocked = results.filter(r => !r.allowed).length;

      expect(allowed).toBe(10); // Exactly 10 should be allowed
      expect(blocked).toBe(10); // Exactly 10 should be blocked
    });
  });
});

describe('Real-World Cache Scenarios', () => {
  let cache: Cache;

  beforeEach(async () => {
    cache = new Cache('app');
    const redis = getRedisClient();
    await redis.flushdb();
  });

  describe('User Session Caching', () => {
    it('should cache and retrieve user sessions', async () => {
      const sessionId = 'sess_abc123';
      const sessionData = {
        userId: 'user_123',
        tenantId: 'tenant_456',
        role: 'admin',
        loginAt: new Date().toISOString(),
        lastActivity: Date.now(),
      };

      await cache.set(`session:${sessionId}`, sessionData, 3600); // 1 hour

      const retrieved = await cache.get<typeof sessionData>(`session:${sessionId}`);
      expect(retrieved).toEqual(sessionData);
      expect(retrieved?.role).toBe('admin');
    });

    it('should invalidate all user sessions on logout', async () => {
      const userId = 'user_789';

      // Create multiple sessions
      await cache.set(`session:sess1:${userId}`, { userId, device: 'desktop' }, 3600);
      await cache.set(`session:sess2:${userId}`, { userId, device: 'mobile' }, 3600);
      await cache.set(`session:sess3:${userId}`, { userId, device: 'tablet' }, 3600);

      // Invalidate all user sessions
      await cache.invalidatePattern(`session:*:${userId}`);

      const sess1 = await cache.get(`session:sess1:${userId}`);
      const sess2 = await cache.get(`session:sess2:${userId}`);

      expect(sess1).toBeNull();
      expect(sess2).toBeNull();
    });
  });

  describe('Document Metadata Caching', () => {
    it('should cache document metadata with workspace context', async () => {
      const documentId = 'doc_xyz';
      const metadata = {
        id: documentId,
        name: 'Important Report.pdf',
        size: 2048000,
        classification: 'confidential',
        workspaceId: 'ws_123',
        uploadedBy: 'user_456',
        tags: ['quarterly', 'finance', 'report'],
      };

      await cache.set(`document:${documentId}`, metadata, 300); // 5 minutes

      const cached = await cache.get<typeof metadata>(`document:${documentId}`);
      expect(cached?.classification).toBe('confidential');
      expect(cached?.tags).toContain('quarterly');
    });

    it('should invalidate workspace documents on update', async () => {
      const workspaceId = 'ws_update';

      await cache.set(`document:doc1:${workspaceId}`, { name: 'Doc 1' });
      await cache.set(`document:doc2:${workspaceId}`, { name: 'Doc 2' });
      await cache.set(`search:results:${workspaceId}`, ['doc1', 'doc2']);

      // Invalidate all workspace-related cache
      await cache.invalidatePattern(`*:${workspaceId}`);

      const doc1 = await cache.get(`document:doc1:${workspaceId}`);
      const search = await cache.get(`search:results:${workspaceId}`);

      expect(doc1).toBeNull();
      expect(search).toBeNull();
    });
  });

  describe('Search Result Caching', () => {
    it('should cache search results with query hash', async () => {
      const queryHash = 'hash_abc123';
      const searchResults = {
        query: 'quantum cryptography',
        results: [
          { id: 'doc1', title: 'PQC Guide', score: 0.95 },
          { id: 'doc2', title: 'Quantum Computing', score: 0.87 },
        ],
        totalResults: 2,
        executionTime: 125,
      };

      await cache.set(`search:${queryHash}`, searchResults, 60); // 1 minute

      const cached = await cache.get<typeof searchResults>(`search:${queryHash}`);
      expect(cached?.results).toHaveLength(2);
      expect(cached?.results[0].score).toBe(0.95);
    });
  });

  describe('API Rate Limiting by Endpoint', () => {
    it('should enforce different limits per endpoint', async () => {
      const apiLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 100 });
      const searchLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 20 });
      const aiLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 10 });

      const userId = 'user_rate_test';

      // User can make many API calls
      for (let i = 0; i < 50; i++) {
        const result = await apiLimiter.consume(`api:${userId}`);
        expect(result.allowed).toBe(true);
      }

      // But limited search calls
      for (let i = 0; i < 20; i++) {
        await searchLimiter.consume(`search:${userId}`);
      }

      const searchBlocked = await searchLimiter.consume(`search:${userId}`);
      expect(searchBlocked.allowed).toBe(false);

      // And even more limited AI calls
      for (let i = 0; i < 10; i++) {
        await aiLimiter.consume(`ai:${userId}`);
      }

      const aiBlocked = await aiLimiter.consume(`ai:${userId}`);
      expect(aiBlocked.allowed).toBe(false);
    });
  });

  describe('Tenant-Isolated Caching', () => {
    it('should keep tenant data isolated', async () => {
      const tenant1 = 'tenant_abc';
      const tenant2 = 'tenant_xyz';

      await cache.set(`${tenant1}:user:123`, { name: 'User in Tenant 1' });
      await cache.set(`${tenant2}:user:123`, { name: 'User in Tenant 2' });

      const t1User = await cache.get<any>(`${tenant1}:user:123`);
      const t2User = await cache.get<any>(`${tenant2}:user:123`);

      expect(t1User.name).toBe('User in Tenant 1');
      expect(t2User.name).toBe('User in Tenant 2');

      // Invalidating tenant 1 should not affect tenant 2
      await cache.invalidatePattern(`${tenant1}:*`);

      const t1After = await cache.get(`${tenant1}:user:123`);
      const t2After = await cache.get<any>(`${tenant2}:user:123`);

      expect(t1After).toBeNull();
      expect(t2After.name).toBe('User in Tenant 2');
    });
  });
});
