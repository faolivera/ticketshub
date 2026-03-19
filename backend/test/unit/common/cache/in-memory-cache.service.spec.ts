import { InMemoryCacheService } from '../../../../src/common/cache/in-memory-cache.service';

describe('InMemoryCacheService', () => {
  let service: InMemoryCacheService;

  beforeEach(() => {
    service = new InMemoryCacheService();
  });

  describe('getOrCalculate', () => {
    it('should call calculateFn and return its value on a cache MISS', async () => {
      const calculateFn = jest.fn().mockResolvedValue('computed-value');

      const result = await service.getOrCalculate('key-1', 60, calculateFn);

      expect(result).toBe('computed-value');
      expect(calculateFn).toHaveBeenCalledTimes(1);
    });

    it('should return the cached value without calling calculateFn on a cache HIT', async () => {
      const calculateFn = jest.fn().mockResolvedValue('computed-value');

      await service.getOrCalculate('key-1', 60, calculateFn);
      const result = await service.getOrCalculate('key-1', 60, calculateFn);

      expect(result).toBe('computed-value');
      expect(calculateFn).toHaveBeenCalledTimes(1);
    });

    it('should treat a TTL=0 entry as expired on the next call', async () => {
      const calculateFn = jest
        .fn()
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second');

      // TTL=0 means expiresAt = Date.now() + 0, which is already expired by
      // the time the second call runs (even if only by a millisecond).
      await service.getOrCalculate('key-ttl', 0, calculateFn);

      // Small delay to ensure Date.now() advances past the expiry.
      await new Promise((resolve) => setTimeout(resolve, 5));

      const result = await service.getOrCalculate('key-ttl', 0, calculateFn);

      expect(result).toBe('second');
      expect(calculateFn).toHaveBeenCalledTimes(2);
    });

    it('should re-throw errors from calculateFn without caching', async () => {
      const error = new Error('calculation failed');
      const calculateFn = jest.fn().mockRejectedValue(error);

      await expect(
        service.getOrCalculate('key-err', 60, calculateFn),
      ).rejects.toThrow('calculation failed');

      // Should not be cached — calculateFn must be called again.
      const calculateFnOk = jest.fn().mockResolvedValue('recovered');
      const result = await service.getOrCalculate('key-err', 60, calculateFnOk);

      expect(result).toBe('recovered');
      expect(calculateFnOk).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidate', () => {
    it('should cause the next getOrCalculate to call calculateFn again', async () => {
      const calculateFn = jest
        .fn()
        .mockResolvedValueOnce('initial')
        .mockResolvedValueOnce('after-invalidation');

      await service.getOrCalculate('key-inv', 60, calculateFn);
      service.invalidate('key-inv');
      const result = await service.getOrCalculate('key-inv', 60, calculateFn);

      expect(result).toBe('after-invalidation');
      expect(calculateFn).toHaveBeenCalledTimes(2);
    });

    it('should be a no-op when the key does not exist', () => {
      expect(() => service.invalidate('nonexistent-key')).not.toThrow();
    });
  });
});
