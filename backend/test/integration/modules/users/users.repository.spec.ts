import { PrismaClient } from '@prisma/client';
import { UsersRepository } from '@/modules/users/users.repository';
import { Role, Language } from '@/modules/users/users.domain';
import type { CreateUserData } from '@/modules/users/users.repository.interface';
import type { Ctx } from '@/common/types/context';
import {
  getTestPrismaClient,
  disconnectTestPrisma,
} from '../../setup/test-prisma.service';
import { truncateAllTables, createTestContext } from '../../setup/test-utils';

describe('UsersRepository (Integration)', () => {
  let prisma: PrismaClient;
  let repository: UsersRepository;
  let ctx: Ctx;

  const createValidUserData = (
    overrides?: Partial<CreateUserData>,
  ): CreateUserData => ({
    email: `test-${Date.now()}@example.com`,
    firstName: 'John',
    lastName: 'Doe',
    publicName: 'johndoe',
    password: 'hashedpassword123',
    role: Role.User,
    language: Language.EN,
    emailVerified: false,
    phoneVerified: false,
    buyerDisputed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    imageId: 'default',
    ...overrides,
  });

  beforeAll(async () => {
    prisma = await getTestPrismaClient();
    repository = new UsersRepository(prisma as any);
  });

  beforeEach(async () => {
    await truncateAllTables(prisma);
    ctx = createTestContext();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
  });

  describe('add', () => {
    it('should create a new user', async () => {
      const userData = createValidUserData();

      const user = await repository.add(ctx, userData);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email.trim().toLowerCase());
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.role).toBe(Role.User);
      expect(user.acceptedSellerTermsAt).toBeUndefined();
    });

    it('should create a user with all optional fields', async () => {
      const userData = createValidUserData({
        phone: '+1234567890',
        address: {
          line1: '123 Main St',
          city: 'Berlin',
          state: 'Berlin',
          postalCode: '10115',
          countryCode: 'DE',
          geoPoint: { lat: 52.52, lng: 13.405 },
        },
        emailVerified: true,
        phoneVerified: true,
      });

      const user = await repository.add(ctx, userData);

      expect(user.phone).toBe('+1234567890');
      expect(user.address).toBeDefined();
      expect(user.address?.city).toBe('Berlin');
      expect(user.emailVerified).toBe(true);
      expect(user.phoneVerified).toBe(true);
    });

    it('should store email in lowercase', async () => {
      const userData = createValidUserData({ email: 'User@Example.COM' });

      const user = await repository.add(ctx, userData);

      expect(user.email).toBe('user@example.com');
    });
  });

  describe('findById', () => {
    it('should return undefined when user does not exist', async () => {
      const user = await repository.findById(ctx, 'non-existent-id');
      expect(user).toBeUndefined();
    });

    it('should find user by id', async () => {
      const created = await repository.add(ctx, createValidUserData());

      const found = await repository.findById(ctx, created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(created.email);
    });
  });

  describe('findByIds', () => {
    it('should return empty array when no ids provided', async () => {
      const users = await repository.findByIds(ctx, []);
      expect(users).toEqual([]);
    });

    it('should return empty array when no users match', async () => {
      const users = await repository.findByIds(ctx, [
        'non-existent-1',
        'non-existent-2',
      ]);
      expect(users).toEqual([]);
    });

    it('should find multiple users by ids', async () => {
      const user1 = await repository.add(
        ctx,
        createValidUserData({ email: 'user1@test.com' }),
      );
      const user2 = await repository.add(
        ctx,
        createValidUserData({ email: 'user2@test.com' }),
      );
      await repository.add(
        ctx,
        createValidUserData({ email: 'user3@test.com' }),
      );

      const users = await repository.findByIds(ctx, [user1.id, user2.id]);

      expect(users).toHaveLength(2);
      expect(users.map((u) => u.id)).toContain(user1.id);
      expect(users.map((u) => u.id)).toContain(user2.id);
    });
  });

  describe('findByEmail', () => {
    it('should return undefined when user does not exist', async () => {
      const user = await repository.findByEmail(ctx, 'nonexistent@example.com');
      expect(user).toBeUndefined();
    });

    it('should find user by email', async () => {
      const email = 'findme@example.com';
      const created = await repository.add(ctx, createValidUserData({ email }));

      const found = await repository.findByEmail(ctx, email);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe(email);
    });

    it('should find user by email case-insensitively', async () => {
      const created = await repository.add(
        ctx,
        createValidUserData({ email: 'login@example.com' }),
      );

      const found = await repository.findByEmail(ctx, 'Login@Example.COM');

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.email).toBe('login@example.com');
    });
  });

  describe('findByEmailContaining', () => {
    it('should return empty array for empty search term', async () => {
      const users = await repository.findByEmailContaining(ctx, '');
      expect(users).toEqual([]);
    });

    it('should return empty array for whitespace search term', async () => {
      const users = await repository.findByEmailContaining(ctx, '   ');
      expect(users).toEqual([]);
    });

    it('should find users by partial email match (case insensitive)', async () => {
      await repository.add(
        ctx,
        createValidUserData({ email: 'john.doe@example.com' }),
      );
      await repository.add(
        ctx,
        createValidUserData({ email: 'jane.doe@example.com' }),
      );
      await repository.add(
        ctx,
        createValidUserData({ email: 'bob.smith@test.com' }),
      );

      const users = await repository.findByEmailContaining(ctx, 'DOE');

      expect(users).toHaveLength(2);
      expect(users.every((u) => u.email.includes('doe'))).toBe(true);
    });
  });

  describe('updateEmailVerified', () => {
    it('should return undefined for non-existent user', async () => {
      const result = await repository.updateEmailVerified(
        ctx,
        'non-existent-id',
        true,
      );
      expect(result).toBeUndefined();
    });

    it('should update email verified status to true', async () => {
      const user = await repository.add(
        ctx,
        createValidUserData({ emailVerified: false }),
      );

      const updated = await repository.updateEmailVerified(ctx, user.id, true);

      expect(updated).toBeDefined();
      expect(updated?.emailVerified).toBe(true);
    });

    it('should update email verified status to false', async () => {
      const user = await repository.add(
        ctx,
        createValidUserData({ emailVerified: true }),
      );

      const updated = await repository.updateEmailVerified(ctx, user.id, false);

      expect(updated).toBeDefined();
      expect(updated?.emailVerified).toBe(false);
    });
  });

  describe('updatePhoneVerified', () => {
    it('should return undefined for non-existent user', async () => {
      const result = await repository.updatePhoneVerified(
        ctx,
        'non-existent-id',
        true,
      );
      expect(result).toBeUndefined();
    });

    it('should update phone verified status', async () => {
      const user = await repository.add(
        ctx,
        createValidUserData({ phoneVerified: false }),
      );

      const updated = await repository.updatePhoneVerified(
        ctx,
        user.id,
        true,
        '+1234567890',
      );

      expect(updated).toBeDefined();
      expect(updated?.phoneVerified).toBe(true);
      expect(updated?.phone).toBe('+1234567890');
    });

    it('should update phone verified without changing phone number', async () => {
      const user = await repository.add(
        ctx,
        createValidUserData({ phone: '+1111111111', phoneVerified: false }),
      );

      const updated = await repository.updatePhoneVerified(ctx, user.id, true);

      expect(updated?.phoneVerified).toBe(true);
      expect(updated?.phone).toBe('+1111111111');
    });
  });

  describe('updateBasicInfo', () => {
    it('should return undefined for non-existent user', async () => {
      const result = await repository.updateBasicInfo(ctx, 'non-existent-id', {
        firstName: 'New',
      });
      expect(result).toBeUndefined();
    });

    it('should update first name', async () => {
      const user = await repository.add(ctx, createValidUserData());

      const updated = await repository.updateBasicInfo(ctx, user.id, {
        firstName: 'NewFirstName',
      });

      expect(updated?.firstName).toBe('NewFirstName');
    });

    it('should update last name', async () => {
      const user = await repository.add(ctx, createValidUserData());

      const updated = await repository.updateBasicInfo(ctx, user.id, {
        lastName: 'NewLastName',
      });

      expect(updated?.lastName).toBe('NewLastName');
    });

    it('should update public name', async () => {
      const user = await repository.add(ctx, createValidUserData());

      const updated = await repository.updateBasicInfo(ctx, user.id, {
        publicName: 'newpublicname',
      });

      expect(updated?.publicName).toBe('newpublicname');
    });

    it('should update multiple fields at once', async () => {
      const user = await repository.add(ctx, createValidUserData());

      const updated = await repository.updateBasicInfo(ctx, user.id, {
        firstName: 'Updated',
        lastName: 'User',
        publicName: 'updateduser',
      });

      expect(updated?.firstName).toBe('Updated');
      expect(updated?.lastName).toBe('User');
      expect(updated?.publicName).toBe('updateduser');
    });

    it('should update address', async () => {
      const user = await repository.add(ctx, createValidUserData());
      const newAddress = {
        line1: '456 New St',
        city: 'Munich',
        state: 'Bavaria',
        postalCode: '80331',
        countryCode: 'DE',
        geoPoint: { lat: 48.1351, lng: 11.582 },
      };

      const updated = await repository.updateBasicInfo(ctx, user.id, {
        address: newAddress,
      });

      expect(updated?.address).toBeDefined();
      expect(updated?.address?.city).toBe('Munich');
    });
  });

  describe('setAcceptedSellerTermsAt', () => {
    it('should return undefined for non-existent user', async () => {
      const result = await repository.setAcceptedSellerTermsAt(
        ctx,
        'non-existent-id',
        new Date(),
      );
      expect(result).toBeUndefined();
    });

    it('should set accepted seller terms timestamp', async () => {
      const user = await repository.add(ctx, createValidUserData());

      const updated = await repository.setAcceptedSellerTermsAt(
        ctx,
        user.id,
        new Date(),
      );

      expect(updated?.acceptedSellerTermsAt).toBeDefined();
    });
  });

  describe('updateIdentityVerificationApproved', () => {
    it('should return undefined for non-existent user', async () => {
      const result = await repository.updateIdentityVerificationApproved(
        ctx,
        'non-existent-id',
        {
          legalFirstName: 'John',
          legalLastName: 'Doe',
          dateOfBirth: '1990-01-01',
          governmentIdNumber: 'ABC123',
        },
      );
      expect(result).toBeUndefined();
    });

    it('should set identity verification approved on user', async () => {
      const user = await repository.add(
        ctx,
        createValidUserData({ acceptedSellerTermsAt: new Date() }),
      );

      const updated = await repository.updateIdentityVerificationApproved(
        ctx,
        user.id,
        {
          legalFirstName: 'John',
          legalLastName: 'Doe',
          dateOfBirth: '1990-01-01',
          governmentIdNumber: 'ABC123456',
        },
      );

      expect(updated).toBeDefined();
      expect(updated?.identityVerification).toBeDefined();
      expect(updated?.identityVerification?.legalFirstName).toBe('John');
      expect(updated?.identityVerification?.legalLastName).toBe('Doe');
      expect(updated?.identityVerification?.dateOfBirth).toBe('1990-01-01');
      expect(updated?.identityVerification?.governmentIdNumber).toBe(
        'ABC123456',
      );
      expect(updated?.identityVerification?.status).toBe('approved');
    });
  });
});
