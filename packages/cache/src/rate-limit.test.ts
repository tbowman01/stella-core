import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../src/rate-limit';

// Mock cache
vi.mock('../src/cache', () => ({
  rateLimitCache: {
    get: vi.fn(),
    increment: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('@arcqubit/cache - Rate Limiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 10,
    });
    vi.clearAllMocks();
  });

  describe('consume', () => {
    it('should allow request under limit', async () => {
      const { rateLimitCache } = await import('../src/cache');
      vi.mocked(rateLimitCache.get).mockResolvedValue(5);
      vi.mocked(rateLimitCache.increment).mockResolvedValue(6);
      vi.mocked(rateLimitCache.ttl).mockResolvedValue(30);

      const result = await rateLimiter.consume('user-123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 6 = 4
    });

    it('should reject request over limit', async () => {
      const { rateLimitCache } = await import('../src/cache');
      vi.mocked(rateLimitCache.get).mockResolvedValue(10);
      vi.mocked(rateLimitCache.ttl).mockResolvedValue(30);

      const result = await rateLimiter.consume('user-123');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should set expiry on first request', async () => {
      const { rateLimitCache } = await import('../src/cache');
      vi.mocked(rateLimitCache.get).mockResolvedValue(0);
      vi.mocked(rateLimitCache.increment).mockResolvedValue(1);
      vi.mocked(rateLimitCache.ttl).mockResolvedValue(-1);

      await rateLimiter.consume('user-123');

      expect(rateLimitCache.increment).toHaveBeenCalled();
      expect(rateLimitCache.expire).toHaveBeenCalledWith('user-123', 60);
    });

    it('should not set expiry on subsequent requests', async () => {
      const { rateLimitCache } = await import('../src/cache');
      vi.mocked(rateLimitCache.get).mockResolvedValue(5);
      vi.mocked(rateLimitCache.increment).mockResolvedValue(6);
      vi.mocked(rateLimitCache.ttl).mockResolvedValue(30);

      await rateLimiter.consume('user-123');

      expect(rateLimitCache.expire).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return current rate limit status', async () => {
      const { rateLimitCache } = await import('../src/cache');
      vi.mocked(rateLimitCache.get).mockResolvedValue(7);
      vi.mocked(rateLimitCache.ttl).mockResolvedValue(30);

      const result = await rateLimiter.getStatus('user-123');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3); // 10 - 7 = 3
    });

    it('should indicate when limit exceeded', async () => {
      const { rateLimitCache } = await import('../src/cache');
      vi.mocked(rateLimitCache.get).mockResolvedValue(15);
      vi.mocked(rateLimitCache.ttl).mockResolvedValue(30);

      const result = await rateLimiter.getStatus('user-123');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('reset', () => {
    it('should delete rate limit key', async () => {
      const { rateLimitCache } = await import('../src/cache');

      await rateLimiter.reset('user-123');

      expect(rateLimitCache.delete).toHaveBeenCalledWith('user-123');
    });
  });
});
