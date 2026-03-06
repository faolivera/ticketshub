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
import { Language, Role, UserStatus } from '../../../../src/modules/users/users.domain';
import type { Image } from '../../../../src/modules/images/images.domain';
import type { Ctx } from '../../../../src/common/types/context';
import { AcceptanceMethod } from '../../../../src/modules/terms/terms.domain';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockImplementation((plain: string) => Promise.resolve(`hashed:${plain}`)),
  compare: jest.fn().mockImplementation((plain: string, stored: string) =>
    Promise.resolve(stored.startsWith('$2') && (plain === 'correct' || plain === 'newPass123')),
  ),
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
      findByIds: jest.fn(),
      findByEmailContaining: jest.fn(),
      getSellers: jest.fn(),
      getAdmins: jest.fn(),
      add: jest.fn(),
      updateBasicInfo: jest.fn(),
      updateEmailVerified: jest.fn(),
      updatePhoneVerified: jest.fn(),
      updateLevel: jest.fn(),
      updateToVerifiedSeller: jest.fn(),
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
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const defaults: Record<string, unknown> = {
          'jwt.secret': 'test-secret',
          'jwt.expiresIn': '7d',
          'users.allowedAvatarMimeTypes': ['image/jpeg', 'image/png', 'image/webp'],
          'users.maxAvatarSizeBytes': 5 * 1024 * 1024,
        };
        return defaults[key];
      }),
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
      expect(result.pic.src).toContain('/public/avatars/');
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
});
