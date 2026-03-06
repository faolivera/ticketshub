import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
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
import { Role, UserStatus, Language } from './users.domain';
import { VerificationHelper } from '../../common/utils/verification-helper';
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

  private static readonly BCRYPT_ROUNDS = 10;

  private async hashPassword(plainPassword: string): Promise<string> {
    return bcrypt.hash(plainPassword, UsersService.BCRYPT_ROUNDS);
  }

  private async verifyPassword(
    plainPassword: string,
    storedHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, storedHash);
  }

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
    const images = await this.imagesRepository.findByIds(
      ctx,
      users.map((user) => user.imageId),
    );
    const imagesMap = new Map<string, Image>(
      images.map((image) => [image.id, image]),
    );
    return Promise.all(
      users.map(async (user) => {
        const image = imagesMap.get(user.imageId);
        return {
          id: user.id,
          publicName: user.publicName,
          pic: image ? await this.resolveImageUrl(image) : null,
        };
      }),
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
   * Get IDs of all admin users (for notifications that target admins)
   */
  async getAdminUserIds(ctx: Ctx): Promise<string[]> {
    const admins = await this.usersRepository.getAdmins(ctx);
    return admins.map((u) => u.id);
  }

  /**
   * Add a new user. Plain password is hashed before storage.
   */
  async add(
    ctx: Ctx,
    user: Omit<User, 'id' | 'country' | 'currency'> &
      Partial<Pick<User, 'country' | 'currency'>>,
  ): Promise<User> {
    const hashedPassword = await this.hashPassword(user.password);
    return await this.usersRepository.add(ctx, {
      ...user,
      password: hashedPassword,
    });
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

    const image = await this.imagesRepository.findById(ctx, user.imageId);
    const resolvedPic = image ? await this.resolveImageUrl(image) : null;

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
      isSeller: VerificationHelper.isSeller(user),
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
    } catch (error) {
      console.error('JWT verify failed:', error);
      return null;
    }
  }

  /**
   * Authenticate user by email and password.
   */
  async login(
    ctx: Ctx,
    email: string,
    password: string,
  ): Promise<LoginResponse | null> {
    const user = await this.findByEmail(ctx, email);
    if (!user) {
      return null;
    }
    const passwordMatch = await this.verifyPassword(password, user.password);
    if (!passwordMatch) {
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
   * Register a new user or resume verification for existing unverified user.
   * Phone is optional and not verified at registration.
   */
  async register(
    ctx: Ctx,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      country: string;
      phone?: string;
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
      const passwordMatch = await this.verifyPassword(
        data.password,
        existing.password,
      );
      if (!passwordMatch) {
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

    // Create new user (add() hashes password). Phone optional, not verified.
    const publicName = `${data.firstName} ${data.lastName[0]}.`;
    const now = new Date();
    const newUser = await this.add(ctx, {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      publicName,
      role: Role.User,
      status: UserStatus.Enabled,
      imageId: 'default',
      country: data.country,
      currency: 'ARS',
      language: Language.ES,
      phone: data.phone,
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
   * Mark user phone as verified (V2). No level change.
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
      const image = await this.imagesRepository.findById(ctx, updates.imageId);
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
    const image = await this.imagesRepository.findById(ctx, updatedUser.imageId);
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
   * Accept seller terms (set intent to sell). Requires V1+V2 to be allowed to create listings;
   * that is enforced at event/listing creation via VerificationHelper.canSell().
   */
  async acceptSellerTerms(
    ctx: Ctx,
    userId: string,
  ): Promise<AuthenticatedUserPublicInfo> {
    const user = await this.usersRepository.findById(ctx, userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const hasAcceptedSellerTerms =
      await this.termsService.hasAcceptedCurrentTerms(
        ctx,
        userId,
        TermsUserType.Seller,
      );

    if (!hasAcceptedSellerTerms) {
      throw new BadRequestException('Must accept seller terms first');
    }

    const now = new Date();
    await this.usersRepository.setAcceptedSellerTermsAt(ctx, userId, now);

    const updatedUserInfo = await this.getAuthenticatedUserInfo(ctx, userId);
    if (!updatedUserInfo) {
      throw new BadRequestException('Failed to get updated user info');
    }

    return updatedUserInfo;
  }

  /**
   * Update user identity verification to approved (V3). Called by identity verification service.
   * If legal name changed from previous V3, invalidates V4 (bank account).
   */
  async setIdentityVerificationApproved(
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

    const prevLegalName =
      user.identityVerification &&
      `${user.identityVerification.legalFirstName ?? ''} ${user.identityVerification.legalLastName ?? ''}`.trim();
    const newLegalName = `${identityData.legalFirstName} ${identityData.legalLastName}`.trim();
    const legalNameChanged =
      prevLegalName !== '' && prevLegalName !== newLegalName;

    await this.usersRepository.updateIdentityVerificationApproved(
      ctx,
      userId,
      identityData,
    );

    if (legalNameChanged && user.bankAccount) {
      await this.usersRepository.invalidateBankAccountVerification(ctx, userId);
    }
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
      const oldImage = await this.imagesRepository.findById(ctx, oldImageId);
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
   * Add or update bank account (V4). Requires V3 (identity) approved.
   * Holder name must match V3 legal name (normalized comparison).
   */
  async updateBankAccount(
    ctx: Ctx,
    userId: string,
    data: { holderName: string; cbuOrCvu: string; alias?: string },
  ): Promise<AuthenticatedUserPublicInfo> {
    const user = await this.usersRepository.findById(ctx, userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (!VerificationHelper.hasV3(user)) {
      throw new BadRequestException(
        'Identity must be verified before adding a bank account',
      );
    }
    const legalFirstName = user.identityVerification?.legalFirstName ?? '';
    const legalLastName = user.identityVerification?.legalLastName ?? '';
    const legalFullName = this.normalizeNameForMatch(
      `${legalFirstName} ${legalLastName}`,
    );
    const holderNormalized = this.normalizeNameForMatch(data.holderName.trim());
    if (legalFullName !== holderNormalized) {
      throw new BadRequestException(
        'Bank account holder name must match your verified identity',
      );
    }
    const cbuCvu = data.cbuOrCvu.replace(/\D/g, '');
    if (cbuCvu.length !== 22) {
      throw new BadRequestException('CBU/CVU must be 22 digits');
    }
    const bankAccount: User['bankAccount'] = {
      holderName: data.holderName.trim(),
      cbuOrCvu: cbuCvu,
      alias: data.alias?.trim(),
      verified: true,
      verifiedAt: new Date(),
    };
    await this.usersRepository.updateBankAccount(ctx, userId, bankAccount);
    const updated = await this.getAuthenticatedUserInfo(ctx, userId);
    if (!updated) {
      throw new BadRequestException('Failed to get updated user info');
    }
    return updated;
  }

  private normalizeNameForMatch(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
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
