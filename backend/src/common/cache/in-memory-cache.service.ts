import { Injectable } from '@nestjs/common';
import { ContextLogger } from '../logger/context-logger';
import { ON_APP_INIT_CTX } from '../types/context';
import type { ICacheService } from './cache.interface';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * In-memory cache implementation using a Map.
 * Suitable for single-instance deployments; for multi-instance, implement
 * ICacheService with a distributed store (e.g. Redis) and swap the provider.
 */
@Injectable()
export class InMemoryCacheService implements ICacheService {
  private readonly logger = new ContextLogger(InMemoryCacheService.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async getOrCalculate<T>(
    key: string,
    ttl: number,
    calculateFn: () => Promise<T>,
  ): Promise<T> {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;

    if (entry !== undefined && Date.now() < entry.expiresAt) {
      this.logger.debug(ON_APP_INIT_CTX, `Cache HIT: ${key}`);
      return entry.value;
    }

    this.logger.debug(ON_APP_INIT_CTX, `Cache MISS: ${key}`);

    let value: T;
    try {
      value = await calculateFn();
    } catch (error) {
      this.logger.warn(
        ON_APP_INIT_CTX,
        `Cache calculateFn failed for key "${key}": ${String(error)}`,
      );
      throw error;
    }

    this.store.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    return value;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }
}
