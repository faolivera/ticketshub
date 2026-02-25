import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { User, UserAddress } from './users.domain';
import { UserStatus } from './users.domain';
import type { ProfileType } from './users.domain';

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
   * Find users by profile type (returns deep copies)
   */
  async findByProfile(ctx: Ctx, profile: ProfileType): Promise<User[]> {
    const allUsers = await this.storage.getAll(ctx);
    return allUsers
      .filter((user) => user.profiles.includes(profile))
      .map((u) => this.ensureUserStatus(u));
  }

  /**
   * Get all providers (users with Provider profile) (returns deep copies)
   */
  async getProviders(ctx: Ctx): Promise<User[]> {
    return await this.findByProfile(ctx, 'Provider');
  }

  /**
   * Get all customers (users with Customer profile) (returns deep copies)
   */
  async getCustomers(ctx: Ctx): Promise<User[]> {
    return await this.findByProfile(ctx, 'Customer');
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
   * Update user profiles
   */
  async updateProfiles(
    ctx: Ctx,
    userId: string,
    profiles: ProfileType[],
  ): Promise<User | undefined> {
    const existing = await this.storage.get(ctx, userId);
    if (!existing) return undefined;

    const updatedUser: User = {
      ...existing,
      profiles: [...profiles],
    };
    await this.storage.set(ctx, userId, updatedUser);
    return updatedUser;
  }

  /**
   * Add profile to user
   */
  async addProfile(
    ctx: Ctx,
    userId: string,
    profile: ProfileType,
  ): Promise<User | undefined> {
    const existing = await this.storage.get(ctx, userId);
    if (!existing) return undefined;

    if (!existing.profiles.includes(profile)) {
      const updatedUser: User = {
        ...existing,
        profiles: [...existing.profiles, profile],
      };
      await this.storage.set(ctx, userId, updatedUser);
      return updatedUser;
    }
    return existing;
  }

  /**
   * Update last used profile for a user
   */
  async updateLastUsedProfile(
    ctx: Ctx,
    userId: string,
    profile: ProfileType,
  ): Promise<User | undefined> {
    const existing = await this.storage.get(ctx, userId);
    if (!existing) return undefined;

    // Validate that user has this profile
    if (!existing.profiles.includes(profile)) {
      return undefined;
    }

    const updatedUser: User = {
      ...existing,
      lastUsedProfile: profile,
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
}
