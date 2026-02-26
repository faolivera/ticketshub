import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { User, UserAddress } from './users.domain';
import { UserStatus, UserLevel } from './users.domain';

@Injectable()
export class UsersRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<User>;

  constructor() {
    this.storage = new KeyValueFileStorage<User>('users');
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  /**
   * Get all users (returns deep copies)
   */
  async getAll(ctx: Ctx): Promise<User[]> {
    const users = await this.storage.getAll(ctx);
    return users.map((u) => this.ensureUserStatus(u));
  }

  /**
   * Ensure user has status (backward compatibility for existing data)
   */
  private ensureUserStatus(user: User): User {
    if (!user.status) {
      return { ...user, status: UserStatus.Enabled };
    }
    return user;
  }

  /**
   * Find user by ID (returns deep copy)
   */
  async findById(ctx: Ctx, id: string): Promise<User | undefined> {
    const user = await this.storage.get(ctx, id);
    return user ? this.ensureUserStatus(user) : undefined;
  }

  /**
   * Find users by IDs (returns deep copies)
   */
  async findByIds(ctx: Ctx, ids: string[]): Promise<User[]> {
    const users = await this.storage.getMany(ctx, ids);
    return users.map((u) => this.ensureUserStatus(u));
  }

  /**
   * Find user by email (returns deep copy)
   */
  async findByEmail(ctx: Ctx, email: string): Promise<User | undefined> {
    const allUsers = await this.storage.getAll(ctx);
    const user = allUsers.find((u) => u.email === email);
    return user ? this.ensureUserStatus(user) : undefined;
  }

  /**
   * Get all sellers (users with Seller or VerifiedSeller level)
   */
  async getSellers(ctx: Ctx): Promise<User[]> {
    const allUsers = await this.storage.getAll(ctx);
    return allUsers
      .filter(
        (user) =>
          user.level === UserLevel.Seller ||
          user.level === UserLevel.VerifiedSeller,
      )
      .map((u) => this.ensureUserStatus(u));
  }

  /**
   * Add a new user
   */
  async add(
    ctx: Ctx,
    user: Omit<User, 'id' | 'country' | 'currency' | 'status'> &
      Partial<Pick<User, 'country' | 'currency'>> & { status?: UserStatus },
  ): Promise<User> {
    const allUsers = await this.storage.getAll(ctx);
    const newUser: User = {
      id: String(allUsers.length + 1),
      country: user.country || 'Germany',
      currency: user.currency || 'EUR',
      status: user.status ?? UserStatus.Enabled,
      ...user,
    };
    await this.storage.set(ctx, newUser.id, newUser);
    return newUser;
  }

  /**
   * Update user email verification status
   */
  async updateEmailVerified(
    ctx: Ctx,
    userId: string,
    emailVerified: boolean,
  ): Promise<User | undefined> {
    const existing = await this.storage.get(ctx, userId);
    if (!existing) return undefined;

    const updatedUser: User = {
      ...existing,
      emailVerified,
      updatedAt: new Date(),
    };
    await this.storage.set(ctx, userId, updatedUser);
    return updatedUser;
  }

  /**
   * Update user phone verification status
   */
  async updatePhoneVerified(
    ctx: Ctx,
    userId: string,
    phoneVerified: boolean,
    phone?: string,
  ): Promise<User | undefined> {
    const existing = await this.storage.get(ctx, userId);
    if (!existing) return undefined;

    const updatedUser: User = {
      ...existing,
      phoneVerified,
      ...(phoneVerified && phone !== undefined && { phone }),
      updatedAt: new Date(),
    };
    await this.storage.set(ctx, userId, updatedUser);
    return updatedUser;
  }

  /**
   * Update basic user information (firstName, lastName, publicName, address, imageId)
   */
  async updateBasicInfo(
    ctx: Ctx,
    userId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      publicName?: string;
      address?: UserAddress;
      imageId?: string;
    },
  ): Promise<User | undefined> {
    const existing = await this.storage.get(ctx, userId);
    if (!existing) return undefined;

    const updatedUser: User = {
      ...existing,
      ...(updates.firstName !== undefined && { firstName: updates.firstName }),
      ...(updates.lastName !== undefined && { lastName: updates.lastName }),
      ...(updates.publicName !== undefined && {
        publicName: updates.publicName,
      }),
      ...(updates.address !== undefined && { address: updates.address }),
      ...(updates.imageId !== undefined && { imageId: updates.imageId }),
    };
    await this.storage.set(ctx, userId, updatedUser);
    return updatedUser;
  }

  /**
   * Update user level
   */
  async updateLevel(
    ctx: Ctx,
    userId: string,
    level: UserLevel,
  ): Promise<User | undefined> {
    const existing = await this.storage.get(ctx, userId);
    if (!existing) return undefined;

    const updatedUser: User = {
      ...existing,
      level,
      updatedAt: new Date(),
    };
    await this.storage.set(ctx, userId, updatedUser);
    return updatedUser;
  }
}
