import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { OTP } from './otp.domain';
import { OTPStatus } from './otp.domain';

@Injectable()
export class OTPRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<OTP>;

  constructor() {
    this.storage = new KeyValueFileStorage<OTP>('otps');
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  /**
   * Create a new OTP
   */
  async create(ctx: Ctx, otp: OTP): Promise<OTP> {
    await this.storage.set(ctx, otp.id, otp);
    return otp;
  }

  /**
   * Find OTP by ID
   */
  async findById(ctx: Ctx, id: string): Promise<OTP | undefined> {
    return await this.storage.get(ctx, id);
  }

  /**
   * Find latest pending OTP for a user and type
   */
  async findLatestPendingByUserAndType(
    ctx: Ctx,
    userId: string,
    type: string,
  ): Promise<OTP | undefined> {
    const allOtps = await this.storage.getAll(ctx);
    const filtered = allOtps.filter(
      (otp) =>
        otp.userId === userId &&
        otp.type === type &&
        otp.status === OTPStatus.Pending &&
        new Date(otp.expiresAt) > new Date(),
    );
    // Return the most recent one
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }

  /**
   * Update OTP status
   */
  async updateStatus(ctx: Ctx, id: string, status: OTPStatus): Promise<OTP | undefined> {
    const existing = await this.storage.get(ctx, id);
    if (!existing) return undefined;

    const updated: OTP = {
      ...existing,
      status,
      ...(status === OTPStatus.Verified && { verifiedAt: new Date() }),
    };
    await this.storage.set(ctx, id, updated);
    return updated;
  }

  /**
   * Delete OTP by ID
   */
  async delete(ctx: Ctx, id: string): Promise<void> {
    await this.storage.delete(ctx, id);
  }
}
