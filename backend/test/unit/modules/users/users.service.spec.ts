import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../../../src/modules/users/users.service';
import { USERS_REPOSITORY } from '../../../../src/modules/users/users.repository.interface';
import type { IUsersRepository } from '../../../../src/modules/users/users.repository.interface';
import { IMAGES_REPOSITORY } from '../../../../src/modules/images/images.repository.interface';
import type { IImagesRepository } from '../../../../src/modules/images/images.repository.interface';
import { OTPService } from '../../../../src/modules/otp/otp.service';
import { TermsService } from '../../../../src/modules/terms/terms.service';
import {
  PUBLIC_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../../../../src/common/storage/file-storage-provider.interface';
import type { User } from '../../../../src/modules/users/users.domain';
import {
  Language,
  Role,
  UserStatus,
  IdentityVerificationStatus,
} from '../../../../src/modules/users/users.domain';
import type { Image } from '../../../../src/modules/images/images.domain';
import type { Ctx } from '../../../../src/common/types/context';
import { AcceptanceMethod } from '../../../../src/modules/terms/terms.domain';
import { NotificationsService } from '../../../../src/modules/notifications/notifications.service';

jest.mock('bcrypt', () => ({
  hash: jest
    .fn()
    .mockImplementation((plain: string) => Promise.resolve(`hashed:${plain}`)),
  compare: jest
    .fn()
    .mockImplementation((plain: string, stored: string) =>
      Promise.resolve(
        stored.startsWith('$2') &&
          (plain === 'correct' || plain === 'newPass123'),
      ),
    ),
}));

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<IUsersRepository>;
  let imagesRepository: jest.Mocked<IImagesRepository>;
  let storageProvider: jest.Mocked<FileStorageProvider>;
  let mockOTPService: { sendOTP: jest.Mock; verifyOTP: jest.Mock };
  let mockTermsService: {
    validateTermsVersion: jest.Mock;
    acceptTerms: jest.Mock;
    hasAcceptedCurrentTerms: jest.Mock;
  };

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockUser: User = {
    id: 'user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    publicName: 'John D.',
    role: Role.User,
    status: UserStatus.Enabled,
    imageId: 'default',
    password: '$2b$10$hashed',
    country: 'ES',
    currency: 'EUR',
    language: Language.ES,
    emailVerified: true,
    phoneVerified: true,
    buyerDisputed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockImage: Image = {
    id: 'default',
    src: '/images/default/default.png',
  };

  const mockFile = {
    buffer: Buffer.from('test image data'),
    originalname: 'avatar.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
  };

  beforeEach(async () => {
    const mockUsersRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      setGoogleId: jest.fn(),
      findByIds: jest.fn(),
      findByEmailContaining: jest.fn(),
      getAdmins: jest.fn(),
      add: jest.fn(),
      updateBasicInfo: jest.fn(),
      updateEmailVerified: jest.fn(),
      updatePhoneVerified: jest.fn(),
      setPhone: jest.fn(),
      setAcceptedSellerTermsAt: jest.fn(),
      updateIdentityVerificationApproved: jest.fn(),
      invalidateBankAccountVerification: jest.fn(),
      updateBankAccount: jest.fn(),
      findUsersWithBankAccount: jest.fn(),
      setBuyerDisputed: jest.fn(),
      updateForAdmin: jest.fn(),
      findManyPaginated: jest.fn(),
    };

    const mockImagesRepository = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      set: jest.fn(),
    };

    mockOTPService = {
      sendOTP: jest.fn(),
      verifyOTP: jest.fn(),
    };

    mockTermsService = {
      validateTermsVersion: jest.fn(),
      acceptTerms: jest.fn(),
      hasAcceptedCurrentTerms: jest.fn(),
    };

    const mockStorageProvider = {
      store: jest.fn(),
      retrieve: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-avatar-url'),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const defaults: Record<string, unknown> = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '7d',
          'google.clientId': 'test-google-client-id',
          'users.allowedAvatarMimeTypes': [
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
          'users.maxAvatarSizeBytes': 5 * 1024 * 1024,
        };
        return defaults[key];
      }),
    };

    const mockNotificationsService = {
      emit: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USERS_REPOSITORY, useValue: mockUsersRepository },
        { provide: IMAGES_REPOSITORY, useValue: mockImagesRepository },
        { provide: OTPService, useValue: mockOTPService },
        { provide: TermsService, useValue: mockTermsService },
        { provide: PUBLIC_STORAGE_PROVIDER, useValue: mockStorageProvider },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(USERS_REPOSITORY);
    imagesRepository = module.get(IMAGES_REPOSITORY);
    storageProvider = module.get(PUBLIC_STORAGE_PROVIDER);
  });

  describe('add', () => {
    it('should hash password before storing user', async () => {
      const newUser = {
        ...mockUser,
        email: 'new@example.com',
        password: 'plainSecret',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersRepository.add.mockResolvedValue({ ...newUser, id: 'new-id' });

      await service.add(mockCtx, newUser);

      expect(usersRepository.add).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          email: 'new@example.com',
          password: 'hashed:plainSecret',
        }),
      );
    });
  });

  describe('login', () => {
    it('should return token and user when password matches (bcrypt)', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      usersRepository.findById.mockResolvedValue(mockUser);
      imagesRepository.findById.mockResolvedValue(mockImage);

      const result = await service.login(mockCtx, mockUser.email, 'correct');

      expect(result).not.toBeNull();
      expect(result?.token).toBeDefined();
      expect(result?.user.email).toBe(mockUser.email);
    });

    it('should return null when password does not match', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.login(mockCtx, mockUser.email, 'wrong');

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      usersRepository.findByEmail.mockResolvedValue(undefined);

      const result = await service.login(mockCtx, 'nobody@example.com', 'any');

      expect(result).toBeNull();
    });

    it('should return null when user has no password (Google-only)', async () => {
      const googleOnlyUser = { ...mockUser, password: undefined };
      usersRepository.findByEmail.mockResolvedValue(googleOnlyUser);

      const result = await service.login(
        mockCtx,
        mockUser.email,
        'any-password',
      );

      expect(result).toBeNull();
    });

    it('should succeed when email is in different case (case-insensitive lookup)', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      usersRepository.findById.mockResolvedValue(mockUser);
      imagesRepository.findById.mockResolvedValue(mockImage);

      const result = await service.login(
        mockCtx,
        'User@Example.COM',
        'correct',
      );

      expect(result).not.toBeNull();
      expect(result?.token).toBeDefined();
      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        mockCtx,
        'User@Example.COM',
      );
    });
  });

  describe('loginWithGoogle', () => {
    const googlePayload = {
      sub: 'google-sub-123',
      email: 'googleuser@example.com',
      given_name: 'Google',
      family_name: 'User',
    };

    beforeEach(() => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => googlePayload,
      });
    });

    it('should return token and user when user exists by googleId', async () => {
      usersRepository.findByGoogleId.mockResolvedValue(mockUser);
      usersRepository.findById.mockResolvedValue(mockUser);
      imagesRepository.findById.mockResolvedValue(mockImage);

      const result = await service.loginWithGoogle(mockCtx, 'valid-id-token');

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
      expect(usersRepository.findByGoogleId).toHaveBeenCalledWith(
        mockCtx,
        googlePayload.sub,
      );
    });

    it('should throw when idToken is invalid', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(
        service.loginWithGoogle(mockCtx, 'invalid-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when Google clientId is not configured', async () => {
      const configGet = (service as any).configService.get as jest.Mock;
      const originalGet = configGet.getMockImplementation();
      configGet.mockImplementation((key: string) =>
        key === 'google.clientId' ? undefined : originalGet?.(key) ?? 'test-secret',
      );

      await expect(
        service.loginWithGoogle(mockCtx, 'valid-id-token'),
      ).rejects.toThrow(BadRequestException);

      configGet.mockImplementation(originalGet);
    });
  });

  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'newPass123',
      firstName: 'New',
      lastName: 'User',
      country: 'AR',
      termsAcceptance: {
        termsVersionId: 'v1',
        method: AcceptanceMethod.Checkbox,
      },
    };

    beforeEach(() => {
      mockTermsService.validateTermsVersion.mockResolvedValue(undefined);
      mockTermsService.acceptTerms.mockResolvedValue(undefined);
      mockOTPService.sendOTP.mockResolvedValue(undefined);
    });

    it('should create new user with hashed password', async () => {
      usersRepository.findByEmail.mockResolvedValue(undefined);
      usersRepository.add.mockResolvedValue({
        ...mockUser,
        id: 'new-id',
        email: registerData.email,
      });
      usersRepository.findById.mockResolvedValue({
        ...mockUser,
        id: 'new-id',
        email: registerData.email,
      });
      imagesRepository.findById.mockResolvedValue(mockImage);

      await service.register(mockCtx, registerData);

      expect(usersRepository.add).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          email: registerData.email,
          password: 'hashed:newPass123',
        }),
      );
    });

    it('should allow resume verification when existing unverified user has matching password', async () => {
      const existingUnverified: User = {
        ...mockUser,
        email: registerData.email,
        emailVerified: false,
        password: '$2b$10$hashed',
      };
      usersRepository.findByEmail.mockResolvedValue(existingUnverified);
      usersRepository.findById.mockResolvedValue(existingUnverified);
      imagesRepository.findById.mockResolvedValue(mockImage);

      const result = await service.register(mockCtx, registerData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe(registerData.email);
      expect(usersRepository.add).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when existing unverified user has wrong password', async () => {
      const existingUnverified: User = {
        ...mockUser,
        email: registerData.email,
        emailVerified: false,
        password: '$2b$10$stored',
      };
      usersRepository.findByEmail.mockResolvedValue(existingUnverified);

      await expect(
        service.register(mockCtx, { ...registerData, password: 'wrong' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when email already registered and verified', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        email: registerData.email,
        emailVerified: true,
      });

      await expect(service.register(mockCtx, registerData)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully for existing user', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      storageProvider.store.mockResolvedValue({
        key: 'avatars/user_123/new-uuid.jpg',
        metadata: {
          contentType: 'image/jpeg',
          contentLength: 1024,
          originalFilename: 'avatar.jpg',
        },
        location: '/data/public/avatars/user_123/new-uuid.jpg',
      });
      imagesRepository.set.mockResolvedValue();
      usersRepository.updateBasicInfo.mockResolvedValue({
        ...mockUser,
        imageId: 'new-uuid',
      });
      imagesRepository.findById.mockResolvedValue({
        id: 'new-uuid',
        src: '/public/avatars/user_123/new-uuid.jpg',
      });

      const result = await service.uploadAvatar(mockCtx, mockUser.id, mockFile);

      expect(result).toBeDefined();
      expect(result.pic.src).toContain('signed-avatar-url');
      expect(storageProvider.store).toHaveBeenCalledWith(
        expect.stringMatching(/^avatars\/user_123\/.*\.jpg$/),
        mockFile.buffer,
        expect.objectContaining({
          contentType: 'image/jpeg',
          contentLength: 1024,
        }),
      );
      expect(imagesRepository.set).toHaveBeenCalled();
      expect(usersRepository.updateBasicInfo).toHaveBeenCalledWith(
        mockCtx,
        mockUser.id,
        expect.objectContaining({ imageId: expect.any(String) }),
      );
    });

    it('should throw BadRequestException for invalid file type', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);

      const invalidFile = {
        ...mockFile,
        mimetype: 'application/pdf',
      };

      await expect(
        service.uploadAvatar(mockCtx, mockUser.id, invalidFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file too large', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);

      const largeFile = {
        ...mockFile,
        size: 10 * 1024 * 1024, // 10MB
      };

      await expect(
        service.uploadAvatar(mockCtx, mockUser.id, largeFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-existent user', async () => {
      usersRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.uploadAvatar(mockCtx, 'non-existent', mockFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete old avatar when uploading new one', async () => {
      const userWithAvatar: User = {
        ...mockUser,
        imageId: 'old-avatar-id',
      };
      const oldImage: Image = {
        id: 'old-avatar-id',
        src: '/public/avatars/user_123/old-avatar.jpg',
      };

      usersRepository.findById.mockResolvedValue(userWithAvatar);
      imagesRepository.findById
        .mockResolvedValueOnce(oldImage) // First call for old image lookup
        .mockResolvedValue({
          // Subsequent calls for updated user info
          id: 'new-uuid',
          src: '/public/avatars/user_123/new-uuid.jpg',
        });
      storageProvider.store.mockResolvedValue({
        key: 'avatars/user_123/new-uuid.jpg',
        metadata: {
          contentType: 'image/jpeg',
          contentLength: 1024,
          originalFilename: 'avatar.jpg',
        },
        location: '/data/public/avatars/user_123/new-uuid.jpg',
      });
      storageProvider.delete.mockResolvedValue(true);
      imagesRepository.set.mockResolvedValue();
      usersRepository.updateBasicInfo.mockResolvedValue({
        ...userWithAvatar,
        imageId: 'new-uuid',
      });

      await service.uploadAvatar(mockCtx, userWithAvatar.id, mockFile);

      expect(storageProvider.delete).toHaveBeenCalledWith(
        'avatars/user_123/old-avatar.jpg',
      );
    });

    it('should not delete default avatar', async () => {
      usersRepository.findById.mockResolvedValue(mockUser); // imageId: 'default'
      storageProvider.store.mockResolvedValue({
        key: 'avatars/user_123/new-uuid.jpg',
        metadata: {
          contentType: 'image/jpeg',
          contentLength: 1024,
          originalFilename: 'avatar.jpg',
        },
        location: '/data/public/avatars/user_123/new-uuid.jpg',
      });
      imagesRepository.set.mockResolvedValue();
      usersRepository.updateBasicInfo.mockResolvedValue({
        ...mockUser,
        imageId: 'new-uuid',
      });
      imagesRepository.findById.mockResolvedValue({
        id: 'new-uuid',
        src: '/public/avatars/user_123/new-uuid.jpg',
      });

      await service.uploadAvatar(mockCtx, mockUser.id, mockFile);

      expect(storageProvider.delete).not.toHaveBeenCalled();
    });

    it('should handle PNG files correctly', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      storageProvider.store.mockResolvedValue({
        key: 'avatars/user_123/new-uuid.png',
        metadata: {
          contentType: 'image/png',
          contentLength: 2048,
          originalFilename: 'avatar.png',
        },
        location: '/data/public/avatars/user_123/new-uuid.png',
      });
      imagesRepository.set.mockResolvedValue();
      usersRepository.updateBasicInfo.mockResolvedValue({
        ...mockUser,
        imageId: 'new-uuid',
      });
      imagesRepository.findById.mockResolvedValue({
        id: 'new-uuid',
        src: '/public/avatars/user_123/new-uuid.png',
      });

      const pngFile = {
        ...mockFile,
        mimetype: 'image/png',
        originalname: 'avatar.png',
      };

      const result = await service.uploadAvatar(mockCtx, mockUser.id, pngFile);

      expect(result).toBeDefined();
      expect(storageProvider.store).toHaveBeenCalledWith(
        expect.stringMatching(/\.png$/),
        expect.any(Buffer),
        expect.any(Object),
      );
    });

    it('should handle WebP files correctly', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      storageProvider.store.mockResolvedValue({
        key: 'avatars/user_123/new-uuid.webp',
        metadata: {
          contentType: 'image/webp',
          contentLength: 512,
          originalFilename: 'avatar.webp',
        },
        location: '/data/public/avatars/user_123/new-uuid.webp',
      });
      imagesRepository.set.mockResolvedValue();
      usersRepository.updateBasicInfo.mockResolvedValue({
        ...mockUser,
        imageId: 'new-uuid',
      });
      imagesRepository.findById.mockResolvedValue({
        id: 'new-uuid',
        src: '/public/avatars/user_123/new-uuid.webp',
      });

      const webpFile = {
        ...mockFile,
        mimetype: 'image/webp',
        originalname: 'avatar.webp',
      };

      const result = await service.uploadAvatar(mockCtx, mockUser.id, webpFile);

      expect(result).toBeDefined();
      expect(storageProvider.store).toHaveBeenCalledWith(
        expect.stringMatching(/\.webp$/),
        expect.any(Buffer),
        expect.any(Object),
      );
    });
  });

  describe('setBankAccountVerificationStatus', () => {
    const userWithBank: User = {
      ...mockUser,
      id: 'user-with-bank',
      identityVerification: {
        status: IdentityVerificationStatus.Approved,
        legalFirstName: 'John',
        legalLastName: 'Doe',
        dateOfBirth: '1990-01-01',
        governmentIdNumber: '12345678',
        submittedAt: new Date(),
      },
      bankAccount: {
        holderName: 'John Doe',
        cbuOrCvu: '0123456789012345678901',
        verified: false,
      },
    };

    beforeEach(() => {
      imagesRepository.findById.mockResolvedValue(mockImage);
    });

    it('should set verified true and verifiedAt when status is approved', async () => {
      let savedBank: User['bankAccount'];
      usersRepository.findById.mockImplementation((_ctx, id) =>
        Promise.resolve({
          ...userWithBank,
          id,
          bankAccount: savedBank ?? userWithBank.bankAccount,
        }),
      );
      usersRepository.updateBankAccount.mockImplementation(
        (_ctx, _userId, bankAccount) => {
          savedBank = bankAccount;
          return Promise.resolve({ ...userWithBank, bankAccount });
        },
      );

      const result = await service.setBankAccountVerificationStatus(
        mockCtx,
        userWithBank.id,
        'approved',
      );

      expect(result.bankDetailsVerified).toBe(true);
      expect(usersRepository.updateBankAccount).toHaveBeenCalledWith(
        mockCtx,
        userWithBank.id,
        expect.objectContaining({
          holderName: 'John Doe',
          cbuOrCvu: '0123456789012345678901',
          verified: true,
        }),
      );
      const callArg = usersRepository.updateBankAccount.mock.calls[0][2];
      expect(callArg.verifiedAt).toBeInstanceOf(Date);
    });

    it('should set verified false and clear verifiedAt when status is rejected', async () => {
      const userVerified = {
        ...userWithBank,
        bankAccount: {
          ...userWithBank.bankAccount!,
          verified: true,
          verifiedAt: new Date(),
        },
      };
      usersRepository.findById.mockResolvedValue(userVerified);
      usersRepository.updateBankAccount.mockImplementation(
        (_ctx, _userId, bankAccount) =>
          Promise.resolve({
            ...userVerified,
            bankAccount,
          }),
      );

      await service.setBankAccountVerificationStatus(
        mockCtx,
        userWithBank.id,
        'rejected',
      );

      expect(usersRepository.updateBankAccount).toHaveBeenCalledWith(
        mockCtx,
        userWithBank.id,
        expect.objectContaining({
          verified: false,
          verifiedAt: undefined,
        }),
      );
    });

    it('should throw when user not found', async () => {
      usersRepository.findById.mockResolvedValue(undefined);

      await expect(
        service.setBankAccountVerificationStatus(
          mockCtx,
          'nonexistent',
          'approved',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(usersRepository.updateBankAccount).not.toHaveBeenCalled();
    });

    it('should throw when user has no bank account', async () => {
      const userNoBank = { ...mockUser, id: 'no-bank', bankAccount: undefined };
      usersRepository.findById.mockResolvedValue(userNoBank);

      await expect(
        service.setBankAccountVerificationStatus(
          mockCtx,
          userNoBank.id,
          'approved',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(usersRepository.updateBankAccount).not.toHaveBeenCalled();
    });
  });
});
