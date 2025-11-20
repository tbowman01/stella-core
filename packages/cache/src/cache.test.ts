import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Cache } from '../src/cache';

// Mock Redis client
vi.mock('../src/client', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    ttl: vi.fn(),
    expire: vi.fn(),
    incrby: vi.fn(),
    decrby: vi.fn(),
    keys: vi.fn(),
    mget: vi.fn(),
    pipeline: vi.fn(() => ({
      setex: vi.fn(),
      set: vi.fn(),
      exec: vi.fn(async () => []),
    })),
  },
}));

describe('@arcqubit/cache - Cache', () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache('test');
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.get).mockResolvedValue(JSON.stringify({ data: 'test' }));

      const result = await cache.get('key');
      expect(result).toEqual({ data: 'test' });
      expect(redis.default.get).toHaveBeenCalledWith('test:key');
    });

    it('should return null for non-existent key', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.get).mockResolvedValue(null);

      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle non-JSON values', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.get).mockResolvedValue('plain-string');

      const result = await cache.get('key');
      expect(result).toBe('plain-string');
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.set).mockResolvedValue('OK');

      await cache.set('key', { data: 'test' });

      expect(redis.default.set).toHaveBeenCalledWith(
        'test:key',
        JSON.stringify({ data: 'test' })
      );
    });

    it('should set value with TTL', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.setex).mockResolvedValue('OK');

      await cache.set('key', { data: 'test' }, 300);

      expect(redis.default.setex).toHaveBeenCalledWith(
        'test:key',
        300,
        JSON.stringify({ data: 'test' })
      );
    });

    it('should handle string values', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.set).mockResolvedValue('OK');

      await cache.set('key', 'plain-value');

      expect(redis.default.set).toHaveBeenCalledWith('test:key', 'plain-value');
    });
  });

  describe('delete', () => {
    it('should delete key from cache', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.del).mockResolvedValue(1);

      await cache.delete('key');

      expect(redis.default.del).toHaveBeenCalledWith('test:key');
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.exists).mockResolvedValue(1);

      const result = await cache.exists('key');
      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.exists).mockResolvedValue(0);

      const result = await cache.exists('key');
      expect(result).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.get).mockResolvedValue(JSON.stringify({ cached: true }));

      const factory = vi.fn(async () => ({ fresh: true }));
      const result = await cache.getOrSet('key', factory);

      expect(result).toEqual({ cached: true });
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not exists', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.get).mockResolvedValue(null);
      vi.mocked(redis.default.set).mockResolvedValue('OK');

      const factory = vi.fn(async () => ({ fresh: true }));
      const result = await cache.getOrSet('key', factory);

      expect(result).toEqual({ fresh: true });
      expect(factory).toHaveBeenCalledTimes(1);
      expect(redis.default.set).toHaveBeenCalled();
    });

    it('should set TTL when caching factory result', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.get).mockResolvedValue(null);
      vi.mocked(redis.default.setex).mockResolvedValue('OK');

      const factory = vi.fn(async () => ({ fresh: true }));
      await cache.getOrSet('key', factory, 300);

      expect(redis.default.setex).toHaveBeenCalledWith(
        'test:key',
        300,
        JSON.stringify({ fresh: true })
      );
    });
  });

  describe('increment', () => {
    it('should increment value', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.incrby).mockResolvedValue(5);

      const result = await cache.increment('counter', 5);

      expect(result).toBe(5);
      expect(redis.default.incrby).toHaveBeenCalledWith('test:counter', 5);
    });

    it('should increment by 1 if no value provided', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.incrby).mockResolvedValue(1);

      await cache.increment('counter');

      expect(redis.default.incrby).toHaveBeenCalledWith('test:counter', 1);
    });
  });

  describe('invalidatePattern', () => {
    it('should delete all keys matching pattern', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.keys).mockResolvedValue(['test:key1', 'test:key2']);
      vi.mocked(redis.default.del).mockResolvedValue(2);

      await cache.invalidatePattern('key*');

      expect(redis.default.keys).toHaveBeenCalledWith('test:key*');
      expect(redis.default.del).toHaveBeenCalledWith('test:key1', 'test:key2');
    });

    it('should handle no matching keys', async () => {
      const redis = await import('../src/client');
      vi.mocked(redis.default.keys).mockResolvedValue([]);

      await cache.invalidatePattern('nomatch*');

      expect(redis.default.del).not.toHaveBeenCalled();
    });
  });
});
