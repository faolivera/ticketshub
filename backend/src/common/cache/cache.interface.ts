export const CACHE_SERVICE = 'CACHE_SERVICE';

/**
 * Cache abstraction. Implementations may be in-memory (single instance)
 * or distributed (e.g. Redis) for multi-instance deployments.
 */
export interface ICacheService {
  /**
   * Returns the cached value for `key` if it exists and has not expired.
   * Otherwise calls `calculateFn`, stores the result with the given `ttl`
   * in seconds, and returns it.
   */
  getOrCalculate<T>(
    key: string,
    ttl: number,
    calculateFn: () => Promise<T>,
  ): Promise<T>;

  /**
   * Removes the cached entry for `key`. No-op if the key does not exist.
   */
  invalidate(key: string): void;
}
