import { Injectable } from '@nestjs/common';
import { hostname } from 'os';
import { PrismaService } from '../prisma/prisma.service';
import { ContextLogger } from '../logger/context-logger';
import type { Ctx } from '../types/context';

@Injectable()
export class DistributedLockService {
  private readonly logger = new ContextLogger(DistributedLockService.name);
  private readonly holderIdentifier: string;

  constructor(private readonly prisma: PrismaService) {
    this.holderIdentifier = this.generateHolderIdentifier();
  }

  /**
   * Generate a unique identifier for this process instance.
   * Uses hostname + process ID to uniquely identify the lock holder.
   */
  private generateHolderIdentifier(): string {
    return `${hostname()}-${process.pid}`;
  }

  /**
   * Get the holder identifier for this instance.
   */
  getHolderIdentifier(): string {
    return this.holderIdentifier;
  }

  /**
   * Try to acquire a lock. Returns true if successful.
   * If lock exists and is expired, takes it over.
   * If lock exists and is not expired, returns false.
   */
  async acquireLock(
    lockId: string,
    holderIdentifier: string,
    ttlSeconds: number,
  ): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    try {
      // Upsert: insert if not exists, or update if expired
      // The WHERE clause on DO UPDATE ensures we only take over expired locks
      // Use double-quoted camelCase to match actual DB column names (Prisma default)
      const result = await this.prisma.$executeRaw`
        INSERT INTO scheduler_locks (id, "lockedBy", "lockedAt", "expiresAt")
        VALUES (${lockId}, ${holderIdentifier}, ${now}, ${expiresAt})
        ON CONFLICT (id) DO UPDATE SET
          "lockedBy" = ${holderIdentifier},
          "lockedAt" = ${now},
          "expiresAt" = ${expiresAt}
        WHERE scheduler_locks."expiresAt" < ${now}
      `;
      return result === 1;
    } catch (error) {
      console.error('acquireLock error:', error);
      return false;
    }
  }

  /**
   * Release a lock if we own it.
   * Only deletes the lock if the holder identifier matches.
   */
  async releaseLock(lockId: string, holderIdentifier: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM scheduler_locks
      WHERE id = ${lockId} AND "lockedBy" = ${holderIdentifier}
    `;
  }

  /**
   * Execute a function while holding a lock.
   * Automatically acquires and releases the lock.
   * Returns null if the lock couldn't be acquired.
   */
  async withLock<T>(
    lockId: string,
    holderIdentifier: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const acquired = await this.acquireLock(lockId, holderIdentifier, ttlSeconds);
    if (!acquired) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(lockId, holderIdentifier);
    }
  }

  /**
   * Execute a function while holding a lock, with logging.
   * Uses the internal holder identifier and logs acquisition/release.
   * Returns null if the lock couldn't be acquired.
   */
  async withLockAndLog<T>(
    ctx: Ctx,
    lockId: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const acquired = await this.acquireLock(lockId, this.holderIdentifier, ttlSeconds);
    if (!acquired) {
      this.logger.debug(ctx, `Could not acquire lock: ${lockId} (another instance may hold it)`);
      return null;
    }

    this.logger.debug(ctx, `Acquired lock: ${lockId}`);
    try {
      return await fn();
    } finally {
      await this.releaseLock(lockId, this.holderIdentifier);
      this.logger.debug(ctx, `Released lock: ${lockId}`);
    }
  }
}
