import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../../../../modules/users/users.service';
import { UsersRepository } from '../../../../modules/users/users.repository';
import { ImagesRepository } from '../../../../modules/images/images.repository';
import { OTPService } from '../../../../modules/otp/otp.service';
import { TermsService } from '../../../../modules/terms/terms.service';
import {
  PUBLIC_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../../../../common/storage/file-storage-provider.interface';
import type { User } from '../../../../modules/users/users.domain';
import { UserLevel, Role, UserStatus } from '../../../../modules/users/users.domain';
import type { Image } from '../../../../modules/images/images.domain';
import type { Ctx } from '../../../../common/types/context';

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let imagesRepository: jest.Mocked<ImagesRepository>;
  let storageProvider: jest.Mocked<FileStorageProvider>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockUser: User = {
    id: 'user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    publicName: 'John D.',
    role: Role.User,
    level: UserLevel.Buyer,
    status: UserStatus.Enabled,
    imageId: 'default',
    password: 'hashed',
    country: 'ES',
    currency: 'EUR',
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
      add: jest.fn(),
      updateBasicInfo: jest.fn(),
      updateEmailVerified: jest.fn(),
      updatePhoneVerified: jest.fn(),
      updateLevel: jest.fn(),
      updateToVerifiedSeller: jest.fn(),
    };

    const mockImagesRepository = {
      getById: jest.fn(),
      getByIds: jest.fn(),
      set: jest.fn(),
    };

    const mockOTPService = {
      sendOTP: jest.fn(),
      verifyOTP: jest.fn(),
    };

    const mockTermsService = {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: ImagesRepository, useValue: mockImagesRepository },
        { provide: OTPService, useValue: mockOTPService },
        { provide: TermsService, useValue: mockTermsService },
        { provide: PUBLIC_STORAGE_PROVIDER, useValue: mockStorageProvider },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    usersRepository = module.get(UsersRepository);
    imagesRepository = module.get(ImagesRepository);
    storageProvider = module.get(PUBLIC_STORAGE_PROVIDER);
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
      imagesRepository.getById.mockResolvedValue({
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
      imagesRepository.getById
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
      imagesRepository.getById.mockResolvedValue({
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
      imagesRepository.getById.mockResolvedValue({
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
      imagesRepository.getById.mockResolvedValue({
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
