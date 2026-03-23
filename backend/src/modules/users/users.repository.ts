import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { User as PrismaUser } from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type {
  User,
  UserAddress,
  IdentityVerification,
  BankAccount,
} from './users.domain';
import {
  UserStatus,
  Role,
  Language,
  IdentityVerificationStatus,
} from './users.domain';
import type {
  IUsersRepository,
  CreateUserData,
  UpdateBasicInfoData,
  UpdateUserForAdminData,
  VerifiedSellerIdentityData,
} from './users.repository.interface';

/** Normalize email for storage and lookup: trim and lowercase (emails are case-insensitive). */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersRepository implements IUsersRepository {
  private readonly logger = new ContextLogger(UsersRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(_ctx: Ctx, id: string): Promise<User | undefined> {
    this.logger.debug(_ctx, 'findById', { id });
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user ? this.mapToUser(user) : undefined;
  }

  async findByIds(_ctx: Ctx, ids: string[]): Promise<User[]> {
    this.logger.debug(_ctx, 'findByIds', { count: ids.length });
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
    });
    return users.map((u) => this.mapToUser(u));
  }

  async findByEmail(_ctx: Ctx, email: string): Promise<User | undefined> {
    this.logger.debug(_ctx, 'findByEmail');
    const normalized = normalizeEmail(email);
    const user = await this.prisma.user.findFirst({
      where: {
        email: { equals: normalized, mode: 'insensitive' },
      },
    });
    return user ? this.mapToUser(user) : undefined;
  }

  async findByEmails(_ctx: Ctx, emails: string[]): Promise<User[]> {
    this.logger.debug(_ctx, 'findByEmails', { count: emails.length });
    if (emails.length === 0) return [];
    const normalized = [...new Set(emails.map((e) => normalizeEmail(e)))];
    const users = await this.prisma.user.findMany({
      where: { email: { in: normalized } },
    });
    return users.map((u) => this.mapToUser(u));
  }

  async findByGoogleId(_ctx: Ctx, googleId: string): Promise<User | undefined> {
    this.logger.debug(_ctx, 'findByGoogleId', { googleId });
    const user = await this.prisma.user.findUnique({
      where: { googleId },
    });
    return user ? this.mapToUser(user) : undefined;
  }

  async setGoogleId(
    _ctx: Ctx,
    userId: string,
    googleId: string,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { googleId },
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(_ctx, 'setGoogleId failed:', error);
      return undefined;
    }
  }

  async findByEmailContaining(_ctx: Ctx, searchTerm: string): Promise<User[]> {
    this.logger.debug(_ctx, 'findByEmailContaining');
    if (!searchTerm?.trim()) return [];
    const term = searchTerm.trim();
    const users = await this.prisma.user.findMany({
      where: {
        email: {
          contains: term,
          mode: 'insensitive',
        },
      },
    });
    return users.map((u) => this.mapToUser(u));
  }

  async findManyPaginated(
    ctx: Ctx,
    params: { page: number; limit: number; search?: string },
  ): Promise<{ users: User[]; total: number }> {
    this.logger.debug(ctx, 'findManyPaginated', { page: params.page, limit: params.limit, search: params.search });
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;
    const term = search?.trim();
    const where = term
      ? {
          OR: [
            { email: { contains: term, mode: 'insensitive' as const } },
            { firstName: { contains: term, mode: 'insensitive' as const } },
            { lastName: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      users: users.map((u) => this.mapToUser(u)),
      total,
    };
  }

  async getAdmins(ctx: Ctx): Promise<User[]> {
    this.logger.debug(ctx, 'getAdmins');
    const users = await this.prisma.user.findMany({
      where: { role: 'Admin' },
    });
    return users.map((u) => this.mapToUser(u));
  }

  async add(_ctx: Ctx, userData: CreateUserData): Promise<User> {
    this.logger.debug(_ctx, 'add', { email: userData.email });
    const user = await this.prisma.user.create({
      data: {
        email: normalizeEmail(userData.email),
        firstName: userData.firstName,
        lastName: userData.lastName,
        publicName: userData.publicName,
        password: userData.password ?? null,
        googleId: userData.googleId ?? undefined,
        role: userData.role,
        status: userData.status ?? 'Enabled',
        imageId: userData.imageId,
        phone: userData.phone,
        country: userData.country || 'Argentina',
        currency: userData.currency || 'ARS',
        language: this.mapLanguageToDb(userData.language),
        address: userData.address ? (userData.address as object) : undefined,
        acceptedSellerTermsAt: userData.acceptedSellerTermsAt ?? undefined,
        emailVerified: userData.emailVerified,
        phoneVerified: userData.phoneVerified,
        tosAcceptedAt: userData.tosAcceptedAt,
        identityVerification: userData.identityVerification
          ? this.serializeIdentityVerification(userData.identityVerification)
          : undefined,
        bankAccount: userData.bankAccount
          ? this.serializeBankAccount(userData.bankAccount)
          : undefined,
        buyerDisputed: userData.buyerDisputed ?? false,
      },
    });
    return this.mapToUser(user);
  }

  async updateEmailVerified(
    _ctx: Ctx,
    userId: string,
    emailVerified: boolean,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { emailVerified },
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(_ctx, 'updateEmailVerified failed:', error);
      return undefined;
    }
  }

  async updatePhoneVerified(
    _ctx: Ctx,
    userId: string,
    phoneVerified: boolean,
    phone?: string,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerified,
          ...(phoneVerified && phone !== undefined && { phone }),
        },
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(_ctx, 'updatePhoneVerified failed:', error);
      return undefined;
    }
  }

  async setPhone(
    _ctx: Ctx,
    userId: string,
    phone: string,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { phone: phone.trim() },
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(_ctx, 'setPhone failed:', error);
      return undefined;
    }
  }

  async updateBasicInfo(
    _ctx: Ctx,
    userId: string,
    updates: UpdateBasicInfoData,
  ): Promise<User | undefined> {
    try {
      const data: Record<string, unknown> = {};
      if (updates.firstName !== undefined) data.firstName = updates.firstName;
      if (updates.lastName !== undefined) data.lastName = updates.lastName;
      if (updates.publicName !== undefined)
        data.publicName = updates.publicName;
      if (updates.address !== undefined)
        data.address = updates.address as object;
      if (updates.imageId !== undefined) data.imageId = updates.imageId;

      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(_ctx, 'updateBasicInfo failed:', error);
      return undefined;
    }
  }

  async setAcceptedSellerTermsAt(
    _ctx: Ctx,
    userId: string,
    acceptedSellerTermsAt: Date,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { acceptedSellerTermsAt },
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(_ctx, 'setAcceptedSellerTermsAt failed:', error);
      return undefined;
    }
  }

  async updateIdentityVerificationApproved(
    _ctx: Ctx,
    userId: string,
    identityData: VerifiedSellerIdentityData,
  ): Promise<User | undefined> {
    try {
      const now = new Date();
      const identityVerification: IdentityVerification = {
        status: IdentityVerificationStatus.Approved,
        legalFirstName: identityData.legalFirstName,
        legalLastName: identityData.legalLastName,
        dateOfBirth: identityData.dateOfBirth,
        governmentIdNumber: identityData.governmentIdNumber,
        submittedAt: now,
        reviewedAt: now,
      };

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          identityVerification:
            this.serializeIdentityVerification(identityVerification),
        },
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(
        _ctx,
        'updateIdentityVerificationApproved failed:',
        error,
      );
      return undefined;
    }
  }

  async invalidateBankAccountVerification(
    _ctx: Ctx,
    userId: string,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user?.bankAccount || typeof user.bankAccount !== 'object') {
        return user ? this.mapToUser(user) : undefined;
      }
      const bank = user.bankAccount as Record<string, unknown>;
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          bankAccount: {
            ...bank,
            verified: false,
            verifiedAt: null,
          } as object,
        },
      });
      return this.mapToUser(updated);
    } catch (error) {
      this.logger.error(
        _ctx,
        'invalidateBankAccountVerification failed:',
        error,
      );
      return undefined;
    }
  }

  async updateBankAccount(
    _ctx: Ctx,
    userId: string,
    bankAccount: User['bankAccount'],
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          bankAccount: bankAccount
            ? this.serializeBankAccount(bankAccount)
            : undefined,
        },
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(_ctx, 'updateBankAccount failed:', error);
      return undefined;
    }
  }

  async findUsersWithBankAccount(_ctx: Ctx): Promise<User[]> {
    this.logger.debug(_ctx, 'findUsersWithBankAccount');
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM users WHERE "bankAccount" IS NOT NULL
    `;
    const ids = rows.map((r) => r.id);
    if (ids.length === 0) return [];
    const users = await this.findByIds(_ctx, ids);
    return users.filter((u) => u.bankAccount != null);
  }

  async setBuyerDisputed(_ctx: Ctx, userId: string): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { buyerDisputed: true },
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(_ctx, 'setBuyerDisputed failed:', error);
      return undefined;
    }
  }

  async updateForAdmin(
    _ctx: Ctx,
    userId: string,
    data: UpdateUserForAdminData,
  ): Promise<User | undefined> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.publicName !== undefined)
        updateData.publicName = data.publicName;
      if (data.email !== undefined)
        updateData.email = normalizeEmail(data.email);
      if (data.role !== undefined) updateData.role = data.role;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.emailVerified !== undefined)
        updateData.emailVerified = data.emailVerified;
      if (data.phoneVerified !== undefined)
        updateData.phoneVerified = data.phoneVerified;
      if (data.country !== undefined) updateData.country = data.country;
      if (data.currency !== undefined) updateData.currency = data.currency;
      if (data.language !== undefined)
        updateData.language = this.mapLanguageToDb(data.language);
      if (data.tosAcceptedAt !== undefined)
        updateData.tosAcceptedAt = data.tosAcceptedAt;
      if (data.acceptedSellerTermsAt !== undefined)
        updateData.acceptedSellerTermsAt = data.acceptedSellerTermsAt;
      if (data.buyerDisputed !== undefined)
        updateData.buyerDisputed = data.buyerDisputed;

      if (data.identityVerification !== undefined) {
        const current = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { identityVerification: true },
        });
        const existing = current?.identityVerification
          ? this.parseIdentityVerification(current.identityVerification)
          : null;
        if (existing) {
          const merged: IdentityVerification = {
            ...existing,
            ...data.identityVerification,
          };
          updateData.identityVerification =
            this.serializeIdentityVerification(merged);
        }
      }

      if (data.bankAccount !== undefined) {
        const current = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { bankAccount: true },
        });
        const existing = current?.bankAccount
          ? this.parseBankAccount(current.bankAccount)
          : null;
        const merged: BankAccount = existing
          ? { ...existing, ...data.bankAccount }
          : {
              holderName: data.bankAccount.holderName ?? '',
              cbuOrCvu: data.bankAccount.cbuOrCvu ?? '',
              alias: data.bankAccount.alias,
              verified: data.bankAccount.verified ?? false,
              verifiedAt: data.bankAccount.verifiedAt,
            };
        updateData.bankAccount = this.serializeBankAccount(merged);
      }

      const user = await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
      return this.mapToUser(user);
    } catch (error) {
      this.logger.error(_ctx, 'updateForAdmin failed:', error);
      return undefined;
    }
  }

  private mapToUser(prismaUser: PrismaUser): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      firstName: prismaUser.firstName,
      lastName: prismaUser.lastName,
      role: prismaUser.role as Role,
      status: prismaUser.status as UserStatus,
      publicName: prismaUser.publicName,
      imageId: prismaUser.imageId ?? 'default',
      phone: prismaUser.phone ?? undefined,
      password: prismaUser.password ?? undefined,
      googleId: prismaUser.googleId ?? undefined,
      country: prismaUser.country,
      currency: prismaUser.currency as User['currency'],
      language: this.mapLanguageFromDb(prismaUser.language),
      address: prismaUser.address
        ? (prismaUser.address as unknown as UserAddress)
        : undefined,
      acceptedSellerTermsAt: prismaUser.acceptedSellerTermsAt ?? undefined,
      emailVerified: prismaUser.emailVerified,
      phoneVerified: prismaUser.phoneVerified,
      tosAcceptedAt: prismaUser.tosAcceptedAt ?? undefined,
      identityVerification: prismaUser.identityVerification
        ? this.parseIdentityVerification(prismaUser.identityVerification)
        : undefined,
      bankAccount: prismaUser.bankAccount
        ? this.parseBankAccount(prismaUser.bankAccount)
        : undefined,
      buyerDisputed: prismaUser.buyerDisputed ?? false,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  private parseBankAccount(json: unknown): BankAccount {
    const data = json as Record<string, unknown>;
    return {
      holderName: data.holderName as string,
      cbuOrCvu: (data.cbuOrCvu ?? data.iban) as string,
      alias: data.alias as string | undefined,
      verified: data.verified === true,
      verifiedAt: data.verifiedAt
        ? new Date(data.verifiedAt as string)
        : undefined,
    };
  }

  private serializeBankAccount(bank: BankAccount): object {
    return {
      holderName: bank.holderName,
      cbuOrCvu: bank.cbuOrCvu,
      alias: bank.alias,
      verified: bank.verified,
      verifiedAt: bank.verifiedAt?.toISOString(),
    };
  }

  private mapLanguageToDb(language: Language): 'es' | 'en' {
    return language === Language.ES ? 'es' : 'en';
  }

  private mapLanguageFromDb(dbLanguage: 'es' | 'en'): Language {
    return dbLanguage === 'es' ? Language.ES : Language.EN;
  }

  private parseIdentityVerification(json: unknown): IdentityVerification {
    const data = json as Record<string, unknown>;
    return {
      status: data.status as IdentityVerificationStatus,
      legalFirstName: data.legalFirstName as string,
      legalLastName: data.legalLastName as string,
      dateOfBirth: data.dateOfBirth as string,
      governmentIdNumber: data.governmentIdNumber as string,
      submittedAt: new Date(data.submittedAt as string),
      reviewedAt: data.reviewedAt
        ? new Date(data.reviewedAt as string)
        : undefined,
      reviewedBy: data.reviewedBy as string | undefined,
      rejectionReason: data.rejectionReason as string | undefined,
    };
  }

  private serializeIdentityVerification(iv: IdentityVerification): object {
    return {
      status: iv.status,
      legalFirstName: iv.legalFirstName,
      legalLastName: iv.legalLastName,
      dateOfBirth: iv.dateOfBirth,
      governmentIdNumber: iv.governmentIdNumber,
      submittedAt: iv.submittedAt.toISOString(),
      reviewedAt: iv.reviewedAt?.toISOString(),
      reviewedBy: iv.reviewedBy,
      rejectionReason: iv.rejectionReason,
    };
  }
}
