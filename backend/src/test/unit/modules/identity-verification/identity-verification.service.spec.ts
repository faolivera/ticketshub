import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { IdentityVerificationService } from '../../../../modules/identity-verification/identity-verification.service';
import { IdentityVerificationRepository } from '../../../../modules/identity-verification/identity-verification.repository';
import { UsersService } from '../../../../modules/users/users.service';
import {
  FILE_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../../../../common/storage/file-storage-provider.interface';
import { IdentityVerificationStatus } from '../../../../modules/identity-verification/identity-verification.domain';
import type { IdentityVerificationRequest } from '../../../../modules/identity-verification/identity-verification.domain';
import type { User } from '../../../../modules/users/users.domain';
import { UserLevel, Role, UserStatus } from '../../../../modules/users/users.domain';
import type { Ctx } from '../../../../common/types/context';

describe('IdentityVerificationService', () => {
  let service: IdentityVerificationService;
  let repository: jest.Mocked<IdentityVerificationRepository>;
  let usersService: jest.Mocked<UsersService>;
  let storageProvider: jest.Mocked<FileStorageProvider>;

  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-request-id' };

  const mockUser: User = {
    id: 'user_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    publicName: 'John Doe',
    role: Role.User,
    level: UserLevel.Seller,
    status: UserStatus.Enabled,
    imageId: 'img_1',
    password: 'hashed',
    country: 'ES',
    currency: 'EUR',
    emailVerified: true,
    phoneVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVerification: IdentityVerificationRequest = {
    id: 'idv_123',
    userId: 'user_123',
    legalFirstName: 'John',
    legalLastName: 'Doe',
    dateOfBirth: '1990-01-15',
    governmentIdNumber: '12345678A',
    documentFrontStorageKey: 'identity-docs/user_123_front_123_abc.jpg',
    documentFrontFilename: 'front.jpg',
    documentBackStorageKey: 'identity-docs/user_123_back_123_def.jpg',
    documentBackFilename: 'back.jpg',
    status: IdentityVerificationStatus.Pending,
    submittedAt: new Date(),
  };

  const mockFile = {
    buffer: Buffer.from('test image data'),
    originalname: 'document.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
  };

  beforeEach(async () => {
    const mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findAll: jest.fn(),
      findAllPending: jest.fn(),
      countPending: jest.fn(),
    };

    const mockUsersService = {
      findById: jest.fn(),
      findByIds: jest.fn(),
      upgradeToVerifiedSeller: jest.fn(),
    };

    const mockStorageProvider = {
      store: jest.fn(),
      retrieve: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityVerificationService,
        { provide: IdentityVerificationRepository, useValue: mockRepository },
        { provide: UsersService, useValue: mockUsersService },
        { provide: FILE_STORAGE_PROVIDER, useValue: mockStorageProvider },
      ],
    }).compile();

    service = module.get<IdentityVerificationService>(
      IdentityVerificationService,
    );
    repository = module.get(IdentityVerificationRepository);
    usersService = module.get(UsersService);
    storageProvider = module.get(FILE_STORAGE_PROVIDER);
  });

  describe('submitVerification', () => {
    const submitData = {
      legalFirstName: 'John',
      legalLastName: 'Doe',
      dateOfBirth: '1990-01-15',
      governmentIdNumber: '12345678A',
    };

    it('should successfully submit verification', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      repository.findByUserId.mockResolvedValue(undefined);
      storageProvider.store.mockResolvedValue({
        key: 'test-key',
        metadata: { contentType: 'image/jpeg', contentLength: 1024 },
        location: '/test/path',
      });
      repository.save.mockResolvedValue();

      const result = await service.submitVerification(
        mockCtx,
        mockUser.id,
        submitData,
        mockFile,
        mockFile,
      );

      expect(result.userId).toBe(mockUser.id);
      expect(result.legalFirstName).toBe(submitData.legalFirstName);
      expect(result.status).toBe(IdentityVerificationStatus.Pending);
      expect(storageProvider.store).toHaveBeenCalledTimes(2);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      usersService.findById.mockResolvedValue(undefined);

      await expect(
        service.submitVerification(
          mockCtx,
          'nonexistent',
          submitData,
          mockFile,
          mockFile,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if user is already VerifiedSeller', async () => {
      const verifiedUser = { ...mockUser, level: UserLevel.VerifiedSeller };
      usersService.findById.mockResolvedValue(verifiedUser);

      await expect(
        service.submitVerification(
          mockCtx,
          verifiedUser.id,
          submitData,
          mockFile,
          mockFile,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if pending verification exists', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      repository.findByUserId.mockResolvedValue(mockVerification);

      await expect(
        service.submitVerification(
          mockCtx,
          mockUser.id,
          submitData,
          mockFile,
          mockFile,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid file type', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      repository.findByUserId.mockResolvedValue(undefined);

      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };

      await expect(
        service.submitVerification(
          mockCtx,
          mockUser.id,
          submitData,
          invalidFile,
          mockFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file too large', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      repository.findByUserId.mockResolvedValue(undefined);

      const largeFile = { ...mockFile, size: 15 * 1024 * 1024 };

      await expect(
        service.submitVerification(
          mockCtx,
          mockUser.id,
          submitData,
          largeFile,
          mockFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for missing required fields', async () => {
      usersService.findById.mockResolvedValue(mockUser);
      repository.findByUserId.mockResolvedValue(undefined);

      const incompleteData = { ...submitData, legalFirstName: '' };

      await expect(
        service.submitVerification(
          mockCtx,
          mockUser.id,
          incompleteData,
          mockFile,
          mockFile,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyVerification', () => {
    it('should return verification for user', async () => {
      repository.findByUserId.mockResolvedValue(mockVerification);

      const result = await service.getMyVerification(mockCtx, mockUser.id);

      expect(result).toEqual(mockVerification);
      expect(repository.findByUserId).toHaveBeenCalledWith(mockCtx, mockUser.id);
    });

    it('should return null if no verification exists', async () => {
      repository.findByUserId.mockResolvedValue(undefined);

      const result = await service.getMyVerification(mockCtx, mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('listVerifications', () => {
    it('should list all verifications without status filter', async () => {
      repository.findAll.mockResolvedValue([mockVerification]);
      usersService.findByIds.mockResolvedValue([mockUser]);

      const result = await service.listVerifications(mockCtx);

      expect(result.verifications).toHaveLength(1);
      expect(result.verifications[0].userEmail).toBe(mockUser.email);
      expect(result.total).toBe(1);
    });

    it('should list verifications with status filter', async () => {
      repository.findAll.mockResolvedValue([mockVerification]);
      usersService.findByIds.mockResolvedValue([mockUser]);

      const result = await service.listVerifications(
        mockCtx,
        IdentityVerificationStatus.Pending,
      );

      expect(repository.findAll).toHaveBeenCalledWith(
        mockCtx,
        IdentityVerificationStatus.Pending,
      );
      expect(result.verifications).toHaveLength(1);
    });
  });

  describe('getDocumentFile', () => {
    it('should return front document file', async () => {
      repository.findById.mockResolvedValue(mockVerification);
      storageProvider.retrieve.mockResolvedValue(Buffer.from('image data'));

      const result = await service.getDocumentFile(
        mockCtx,
        mockVerification.id,
        'front',
      );

      expect(result).not.toBeNull();
      expect(result?.filename).toBe(mockVerification.documentFrontFilename);
      expect(storageProvider.retrieve).toHaveBeenCalledWith(
        mockVerification.documentFrontStorageKey,
      );
    });

    it('should return back document file', async () => {
      repository.findById.mockResolvedValue(mockVerification);
      storageProvider.retrieve.mockResolvedValue(Buffer.from('image data'));

      const result = await service.getDocumentFile(
        mockCtx,
        mockVerification.id,
        'back',
      );

      expect(result).not.toBeNull();
      expect(result?.filename).toBe(mockVerification.documentBackFilename);
    });

    it('should throw NotFoundException if verification not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(
        service.getDocumentFile(mockCtx, 'nonexistent', 'front'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return null if file not in storage', async () => {
      repository.findById.mockResolvedValue(mockVerification);
      storageProvider.retrieve.mockResolvedValue(null);

      const result = await service.getDocumentFile(
        mockCtx,
        mockVerification.id,
        'front',
      );

      expect(result).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should approve verification and upgrade user', async () => {
      repository.findById.mockResolvedValue(mockVerification);
      repository.save.mockResolvedValue();
      usersService.upgradeToVerifiedSeller.mockResolvedValue();

      const result = await service.updateStatus(
        mockCtx,
        mockVerification.id,
        'admin_1',
        'approved',
      );

      expect(result.status).toBe(IdentityVerificationStatus.Approved);
      expect(result.reviewedBy).toBe('admin_1');
      expect(usersService.upgradeToVerifiedSeller).toHaveBeenCalledWith(
        mockCtx,
        mockVerification.userId,
        {
          legalFirstName: mockVerification.legalFirstName,
          legalLastName: mockVerification.legalLastName,
          dateOfBirth: mockVerification.dateOfBirth,
          governmentIdNumber: mockVerification.governmentIdNumber,
        },
      );
    });

    it('should reject verification with notes', async () => {
      repository.findById.mockResolvedValue(mockVerification);
      repository.save.mockResolvedValue();

      const result = await service.updateStatus(
        mockCtx,
        mockVerification.id,
        'admin_1',
        'rejected',
        'Document is unclear',
      );

      expect(result.status).toBe(IdentityVerificationStatus.Rejected);
      expect(result.adminNotes).toBe('Document is unclear');
      expect(usersService.upgradeToVerifiedSeller).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if verification not found', async () => {
      repository.findById.mockResolvedValue(undefined);

      await expect(
        service.updateStatus(mockCtx, 'nonexistent', 'admin_1', 'approved'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already reviewed', async () => {
      const approvedVerification = {
        ...mockVerification,
        status: IdentityVerificationStatus.Approved,
      };
      repository.findById.mockResolvedValue(approvedVerification);

      await expect(
        service.updateStatus(
          mockCtx,
          approvedVerification.id,
          'admin_1',
          'rejected',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingCount', () => {
    it('should return count of pending verifications', async () => {
      repository.countPending.mockResolvedValue(5);

      const result = await service.getPendingCount(mockCtx);

      expect(result).toBe(5);
      expect(repository.countPending).toHaveBeenCalledWith(mockCtx);
    });
  });
});
