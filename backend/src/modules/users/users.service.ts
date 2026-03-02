import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { IUsersRepository } from './users.repository.interface';
import { USERS_REPOSITORY } from './users.repository.interface';
import type { IImagesRepository } from '../images/images.repository.interface';
import { IMAGES_REPOSITORY } from '../images/images.repository.interface';
import { OTPService } from '../otp/otp.service';
import { TermsService } from '../terms/terms.service';
import type { Ctx } from '../../common/types/context';
import type { User, UserAddress } from './users.domain';
import type {
  UserPublicInfo,
  AuthenticatedUserPublicInfo,
} from './users.domain';
import { Role, UserLevel, UserStatus, Language } from './users.domain';
import type { Image } from '../images/images.domain';
import type { JWTPayload, LoginResponse } from './users.domain';
import { OTPType } from '../otp/otp.domain';
import type { TermsAcceptanceData } from './users.api';
import { TermsUserType } from '../terms/terms.domain';
import {
  PUBLIC_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../../common/storage/file-storage-provider.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    @Inject(IMAGES_REPOSITORY)
    private readonly imagesRepository: IImagesRepository,
    @Inject(OTPService)
    private readonly otpService: OTPService,
    @Inject(TermsService)
    private readonly termsService: TermsService,
    @Inject(PUBLIC_STORAGE_PROVIDER)
    private readonly publicStorageProvider: FileStorageProvider,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Resolve image src to a signed URL when it points to public storage (/public/...).
   * Otherwise returns the image unchanged (e.g. default /images/default/...).
   */
  private async resolveImageUrl(image: Image): Promise<Image> {
    if (!image.src.startsWith('/public/')) {
      return image;
    }
    const key = image.src.replace(/^\/public\//, '');
    if (!this.publicStorageProvider.getSignedUrl) {
      return image;
    }
    const signedUrl = await this.publicStorageProvider.getSignedUrl(
      key,
      3600,
    );
    return { ...image, src: signedUrl };
  }

  /**
   * Get user by ID (public info only)
   */
  async getPublicUserInfoByIds(
    ctx: Ctx,
    ids: string[],
  ): Promise<UserPublicInfo[]> {
    const users = await this.findByIds(ctx, ids);
    if (!users) return [];
    const images = await this.imagesRepository.getByIds(
      ctx,
      users.map((user) => user.imageId),
    );
    const imagesMap = new Map<string, Image>(
      images.map((image) => [image.id, image]),
    );
    const defaultPic: Image = {
      id: 'default',
      src: '/images/default/default.png',
    };
    return Promise.all(
      users.map(async (user) => ({
        id: user.id,
        publicName: user.publicName,
        pic: await this.resolveImageUrl(
          imagesMap.get(user.imageId) || defaultPic,
        ),
      })),
    );
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
   * Find users whose email contains the search term (case-insensitive).
   * Used for admin transaction search.
   */
  async findByEmailContaining(
    ctx: Ctx,
    searchTerm: string,
  ): Promise<User[]> {
    return await this.usersRepository.findByEmailContaining(ctx, searchTerm);
  }

  /**
   * Get all sellers (users with Seller or VerifiedSeller level)
   */
  async getSellers(ctx: Ctx): Promise<User[]> {
    return await this.usersRepository.getSellers(ctx);
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
   * Get authenticated user info (for use with JWT tokens)
   */
  async getAuthenticatedUserInfo(
    ctx: Ctx,
    userId: string,
  ): Promise<AuthenticatedUserPublicInfo | null> {
    const user = await this.usersRepository.findById(ctx, userId);
    if (!user) {
      return null;
    }

    let image: Image | undefined = await this.imagesRepository.getById(
      ctx,
      user.imageId,
    );
    if (!image) {
      image = {
        id: 'default',
        src: '/images/default/default.png',
      };
    }
    const resolvedPic = await this.resolveImageUrl(image);

    const { password: _password, imageId: _imageId, ...safeUser } = user;
    return {
      ...safeUser,
      pic: resolvedPic,
    };
  }

  /**
   * Generate JWT token for user
   */
  private generateToken(user: User): string {
    const secret = this.configService.get<string>('jwt.secret');
    const expiresIn = this.configService.get<string>('jwt.expiresIn');
    if (!secret) {
      throw new Error('jwt.secret is required. Set JWT_SECRET or configure in HOCON.');
    }
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      level: user.level,
    };
    return jwt.sign(payload, secret, { expiresIn: expiresIn ?? '7d' } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const secret = this.configService.get<string>('jwt.secret');
      if (!secret) return null;
      const decoded = jwt.verify(token, secret) as JWTPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Authenticate user by email and password
   */
  async login(
    ctx: Ctx,
    email: string,
    password: string,
  ): Promise<LoginResponse | null> {
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
      user: userInfo,
      requiresEmailVerification: !user.emailVerified,
    };
  }

  /**
   * Register a new user or resume verification for existing unverified user
   */
  async register(
    ctx: Ctx,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      country: string;
      termsAcceptance: TermsAcceptanceData;
    },
  ): Promise<LoginResponse> {
    // Validate terms acceptance data before proceeding
    if (!data.termsAcceptance?.termsVersionId) {
      throw new BadRequestException(
        'Terms acceptance is required for registration',
      );
    }

    // Validate that the terms version is valid and current for buyer
    await this.termsService.validateTermsVersion(
      ctx,
      data.termsAcceptance.termsVersionId,
      TermsUserType.Buyer,
    );

    const existing = await this.findByEmail(ctx, data.email);

    if (existing) {
      if (existing.emailVerified) {
        throw new ConflictException('Email already registered');
      }
      if (existing.password !== data.password) {
        throw new BadRequestException('Invalid password for existing account');
      }
      // Resume verification: resend OTP
      await this.otpService.sendOTP(
        ctx,
        existing.id,
        OTPType.EmailVerification,
      );
      const token = this.generateToken(existing);
      const userInfo = await this.getAuthenticatedUserInfo(ctx, existing.id);
      if (!userInfo) {
        throw new BadRequestException('User data error');
      }
      return {
        token,
        user: userInfo,
        requiresEmailVerification: true,
      };
    }

    // Create new user
    const publicName = `${data.firstName} ${data.lastName[0]}.`;
    const now = new Date();
    const newUser = await this.usersRepository.add(ctx, {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      publicName,
      role: Role.User,
      level: UserLevel.Basic,
      status: UserStatus.Enabled,
      imageId: 'default',
      country: data.country,
      currency: 'EUR',
      language: Language.ES,
      emailVerified: false,
      phoneVerified: false,
      createdAt: now,
      updatedAt: now,
    });

    // Record terms acceptance for the new user
    await this.termsService.acceptTerms(
      ctx,
      newUser.id,
      data.termsAcceptance.termsVersionId,
      data.termsAcceptance.method,
    );

    await this.otpService.sendOTP(ctx, newUser.id, OTPType.EmailVerification);

    const token = this.generateToken(newUser);
    const userInfo = await this.getAuthenticatedUserInfo(ctx, newUser.id);
    if (!userInfo) {
      throw new BadRequestException('User data error');
    }

    return {
      token,
      user: userInfo,
      requiresEmailVerification: true,
    };
  }

  /**
   * Mark user email as verified
   */
  async markEmailVerified(ctx: Ctx, userId: string): Promise<void> {
    await this.usersRepository.updateEmailVerified(ctx, userId, true);
  }

  /**
   * Mark user phone as verified and upgrade to Buyer level if Basic
   */
  async markPhoneVerified(
    ctx: Ctx,
    userId: string,
    phoneNumber: string,
  ): Promise<void> {
    await this.usersRepository.updatePhoneVerified(
      ctx,
      userId,
      true,
      phoneNumber,
    );

    const user = await this.usersRepository.findById(ctx, userId);
    if (user?.level === UserLevel.Basic) {
      await this.usersRepository.updateLevel(ctx, userId, UserLevel.Buyer);
    }
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
  ): Promise<{
    userId: string;
    email: string;
    publicName: string;
    pic: Image;
    address?: UserAddress;
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

    // Update address if provided
    if (updates.address !== undefined) {
      updateData.address = updates.address;
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
    const updatedUser = await this.usersRepository.updateBasicInfo(
      ctx,
      userId,
      updateData,
    );
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
      address: updatedUser.address,
    };
  }

  /**
   * Upgrade user to seller (requires seller terms to be accepted first)
   */
  async upgradeToSeller(
    ctx: Ctx,
    userId: string,
  ): Promise<AuthenticatedUserPublicInfo> {
    const user = await this.usersRepository.findById(ctx, userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify seller terms are accepted
    const hasAcceptedSellerTerms =
      await this.termsService.hasAcceptedCurrentTerms(
        ctx,
        userId,
        TermsUserType.Seller,
      );

    if (!hasAcceptedSellerTerms) {
      throw new BadRequestException('Must accept seller terms first');
    }

    // Upgrade level to Seller if currently Basic or Buyer
    if (user.level === UserLevel.Basic || user.level === UserLevel.Buyer) {
      await this.usersRepository.updateLevel(ctx, userId, UserLevel.Seller);
    }

    const updatedUserInfo = await this.getAuthenticatedUserInfo(ctx, userId);
    if (!updatedUserInfo) {
      throw new BadRequestException('Failed to get updated user info');
    }

    return updatedUserInfo;
  }

  /**
   * Upgrade user to verified seller (called by identity verification service)
   */
  async upgradeToVerifiedSeller(
    ctx: Ctx,
    userId: string,
    identityData: {
      legalFirstName: string;
      legalLastName: string;
      dateOfBirth: string;
      governmentIdNumber: string;
    },
  ): Promise<void> {
    const user = await this.usersRepository.findById(ctx, userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.usersRepository.updateToVerifiedSeller(ctx, userId, identityData);
  }

  /**
   * Upload user avatar image
   */
  async uploadAvatar(
    ctx: Ctx,
    userId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<AuthenticatedUserPublicInfo> {
    const user = await this.usersRepository.findById(ctx, userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const allowedMimeTypes = this.configService.get<string[]>('users.allowedAvatarMimeTypes') ?? [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    const maxSizeBytes = this.configService.get<number>('users.maxAvatarSizeBytes') ?? 5 * 1024 * 1024;
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}`,
      );
    }
    if (file.size > maxSizeBytes) {
      throw new BadRequestException(
        `File too large. Maximum size: ${maxSizeBytes / 1024 / 1024}MB`,
      );
    }

    // Generate unique key for the avatar
    const extension = this.getExtensionFromMimeType(file.mimetype);
    const imageId = randomUUID();
    const storageKey = `avatars/${userId}/${imageId}.${extension}`;

    // Store file using public storage provider
    await this.publicStorageProvider.store(storageKey, file.buffer, {
      contentType: file.mimetype,
      contentLength: file.size,
      originalFilename: file.originalname,
    });

    // Delete old avatar if not default
    const oldImageId = user.imageId;
    if (oldImageId && oldImageId !== 'default') {
      const oldImage = await this.imagesRepository.getById(ctx, oldImageId);
      if (oldImage && oldImage.src.startsWith('/public/avatars/')) {
        const oldKey = oldImage.src.replace('/public/', '');
        await this.publicStorageProvider.delete(oldKey);
      }
    }

    // Create new image record
    const publicUrl = `/public/${storageKey}`;
    await this.imagesRepository.set(ctx, {
      id: imageId,
      src: publicUrl,
    });

    // Update user's imageId
    await this.usersRepository.updateBasicInfo(ctx, userId, {
      imageId: imageId,
    });

    // Return updated user info
    const updatedUserInfo = await this.getAuthenticatedUserInfo(ctx, userId);
    if (!updatedUserInfo) {
      throw new BadRequestException('Failed to get updated user info');
    }

    return updatedUserInfo;
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return mimeToExt[mimeType] || 'jpg';
  }
}
