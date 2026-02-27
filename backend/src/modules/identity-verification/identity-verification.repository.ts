import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { IdentityVerificationRequest } from './identity-verification.domain';
import { IdentityVerificationStatus } from './identity-verification.domain';

@Injectable()
export class IdentityVerificationRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<IdentityVerificationRequest>;

  constructor() {
    this.storage = new KeyValueFileStorage<IdentityVerificationRequest>(
      'identity-verifications',
    );
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  /**
   * Save or update a verification request
   */
  async save(
    ctx: Ctx,
    verification: IdentityVerificationRequest,
  ): Promise<void> {
    await this.storage.set(ctx, verification.id, verification);
  }

  /**
   * Find verification by ID
   */
  async findById(
    ctx: Ctx,
    id: string,
  ): Promise<IdentityVerificationRequest | undefined> {
    return this.storage.get(ctx, id);
  }

  /**
   * Find most recent verification by user ID
   */
  async findByUserId(
    ctx: Ctx,
    userId: string,
  ): Promise<IdentityVerificationRequest | undefined> {
    const all = await this.storage.getAll(ctx);
    const userVerifications = all.filter((v) => v.userId === userId);
    if (userVerifications.length === 0) {
      return undefined;
    }
    return userVerifications.sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    )[0];
  }

  /**
   * Find all verifications with optional status filter
   */
  async findAll(
    ctx: Ctx,
    status?: IdentityVerificationStatus,
  ): Promise<IdentityVerificationRequest[]> {
    const all = await this.storage.getAll(ctx);
    if (status) {
      return all.filter((v) => v.status === status);
    }
    return all;
  }

  /**
   * Find all pending verifications
   */
  async findAllPending(ctx: Ctx): Promise<IdentityVerificationRequest[]> {
    return this.findAll(ctx, IdentityVerificationStatus.Pending);
  }

  /**
   * Count pending verifications
   */
  async countPending(ctx: Ctx): Promise<number> {
    const pending = await this.findAllPending(ctx);
    return pending.length;
  }
}
