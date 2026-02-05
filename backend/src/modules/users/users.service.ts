import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UsersRepository } from './users.repository';
import { ImagesRepository } from '../images/images.repository';
import { GeocodingService } from '../geocoding/geocoding.service';
import type { Ctx } from '../../common/types/context';
import type { User, UserAddress } from './users.domain';
import type { UserPublicInfo, AuthenticatedUserPublicInfo } from './users.domain';
import type { ProfileType } from './users.domain';
import type { Image } from '../images/images.domain';
import type { JWTPayload, LoginResponse } from './users.domain';
import type { Address } from '../geocoding/geocoding.domain';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

@Injectable()
export class UsersService {
  constructor(
    @Inject(UsersRepository)
    private readonly usersRepository: UsersRepository,
    @Inject(ImagesRepository)
    private readonly imagesRepository: ImagesRepository,
    @Inject(GeocodingService)
    private readonly geocodingService: GeocodingService,
  ) {}

    /**
   * Get user by ID (public info only)
   */
    async getPublicUserInfoByIds(ctx: Ctx, ids: string[]): Promise<UserPublicInfo[]> {
      const users = await this.findByIds(ctx, ids);
      if (!users) return [];
      const images = await this.imagesRepository.getByIds(ctx, users.map(user => user.imageId));
      const imagesMap = new Map<string, Image>(images.map(image => [image.id, image]));
      return users.map(user => ({
        id: user.id,
        publicName: user.publicName,
        pic: imagesMap.get(user.imageId) || { id: 'default', src: '/images/default/default.png' },
      }));
    }

  /**
   * Find user by email
   */
  async findByEmail(ctx: Ctx, email: string): Promise<User | undefined> {
    return await this.usersRepository.findByEmail(ctx, email);
  }

  /**
   * Find user by ID (internal use, returns full user)
   */
  async findById(ctx: Ctx, id: string): Promise<User | undefined> {
    return await this.usersRepository.findById(ctx, id);
  }

  /**
   * Find users by IDs (for internal use)
   */
  async findByIds(ctx: Ctx, ids: string[]): Promise<User[]> {
    return await this.usersRepository.findByIds(ctx, ids);
  }

  /**
   * Get providers
   */
  async getProviders(ctx: Ctx): Promise<User[]> {
    return await this.usersRepository.getProviders(ctx);
  }

  /**
   * Add a new user
   */
  async add(
    ctx: Ctx,
    user: Omit<User, 'id' | 'country' | 'currency'> &
      Partial<Pick<User, 'country' | 'currency'>>,
  ): Promise<User> {
    return await this.usersRepository.add(ctx, user);
  }

  /**
   * Add profile to user
   */
  async addProfile(ctx: Ctx, userId: string, profile: ProfileType): Promise<User | undefined> {
    return await this.usersRepository.addProfile(ctx, userId, profile);
  }

  /**
   * Update last used profile for a user
   */
  async updateLastUsedProfile(ctx: Ctx, userId: string, profile: ProfileType): Promise<User | undefined> {
    return await this.usersRepository.updateLastUsedProfile(ctx, userId, profile);
  }

  /**
   * Get authenticated user info (for use with JWT tokens)
   */
  async getAuthenticatedUserInfo(ctx: Ctx, userId: string): Promise<AuthenticatedUserPublicInfo | null> {
    const user = await this.usersRepository.findById(ctx, userId);
    if (!user) {
      return null;
    }

    let image: Image | undefined = await this.imagesRepository.getById(ctx, user.imageId);
    if (!image) {
      image = {
        id: 'default',
        src: '/images/default/default.png'
      };
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      publicName: user.publicName,
      pic: image,
      profiles: user.profiles,
      lastUsedProfile: user.lastUsedProfile,
      country: user.country,
      currency: user.currency,
      address: user.address,
    };
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      profiles: user.profiles,
    };
    // @ts-ignore - JWT_EXPIRES_IN is a valid string for expiresIn
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Authenticate user by email and password
   */
  async login(ctx: Ctx, email: string, password: string): Promise<LoginResponse | null> {
    const user = await this.findByEmail(ctx, email);
    if (!user || user.password !== password) {
      return null;
    }

    const token = this.generateToken(user);
    
    // Verify user has an image (required for authentication)
    const userInfo = await this.getAuthenticatedUserInfo(ctx, user.id);
    if (!userInfo) {
      return null; // User must have an image
    }

    return {
      token,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        publicName: userInfo.publicName,
        profiles: userInfo.profiles,
        pic: userInfo.pic,
        lastUsedProfile: userInfo.lastUsedProfile,
        country: userInfo.country,
        currency: userInfo.currency,
        address: userInfo.address,
      },
    };
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
      addressToken?: string; // Geocoding JWT token
      imageId?: string;
    },
  ): Promise<{
    userId: string;
    email: string;
    publicName: string;
    pic: Image;
    profiles: ProfileType[];
    lastUsedProfile: ProfileType | undefined;
    address?: Address;
  } | null> {
    const user = await this.usersRepository.findById(ctx, userId);
    if (!user) {
      return null;
    }

    const updateData: {
      firstName?: string;
      lastName?: string;
      publicName?: string;
      address?: UserAddress;
      imageId?: string;
    } = {};

    // Update firstName if provided
    if (updates.firstName !== undefined) {
      updateData.firstName = updates.firstName;
    }

    // Update lastName if provided
    if (updates.lastName !== undefined) {
      updateData.lastName = updates.lastName;
    }

    // Update publicName if provided
    if (updates.publicName !== undefined) {
      updateData.publicName = updates.publicName;
    }

    // Validate and decode geocoding token if provided
    if (updates.addressToken !== undefined) {
      const decoded = this.geocodingService.decodeToken(updates.addressToken);
      if (!decoded) {
        throw new BadRequestException('Invalid or expired geocoding token');
      }
      // Convert Address to UserAddress by adding geoPoint
      updateData.address = {
        ...decoded.normalizedAddress,
        geoPoint: {
          lat: decoded.lat,
          lng: decoded.lng,
        },
      };
    }

    // Validate imageId if provided
    if (updates.imageId !== undefined) {
      const image = await this.imagesRepository.getById(ctx, updates.imageId);
      if (!image) {
        throw new BadRequestException('Invalid imageId');
      }
      updateData.imageId = updates.imageId;
    }

    // Update user
    const updatedUser = await this.usersRepository.updateBasicInfo(ctx, userId, updateData);
    if (!updatedUser) {
      return null;
    }

    // Get updated user info
    const image = await this.imagesRepository.getById(ctx, updatedUser.imageId);
    if (!image) {
      return null;
    }

    return {
      userId: updatedUser.id,
      email: updatedUser.email,
      publicName: updatedUser.publicName,
      pic: image,
      profiles: updatedUser.profiles,
      lastUsedProfile: updatedUser.lastUsedProfile,
      address: updatedUser.address,
    };
  }
}

