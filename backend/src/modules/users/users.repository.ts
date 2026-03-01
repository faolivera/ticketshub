import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { User as PrismaUser } from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import type {
  User,
  UserAddress,
  IdentityVerification,
  BankAccount,
} from './users.domain';
import {
  UserStatus,
  UserLevel,
  Role,
  Language,
  IdentityVerificationStatus,
} from './users.domain';
import type {
  IUsersRepository,
  CreateUserData,
  UpdateBasicInfoData,
  VerifiedSellerIdentityData,
} from './users.repository.interface';

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAll(_ctx: Ctx): Promise<User[]> {
    const users = await this.prisma.user.findMany();
    return users.map((u) => this.mapToUser(u));
  }

  async findById(_ctx: Ctx, id: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user ? this.mapToUser(user) : undefined;
  }

  async findByIds(_ctx: Ctx, ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
    });
    return users.map((u) => this.mapToUser(u));
  }

  async findByEmail(_ctx: Ctx, email: string): Promise<User | undefined> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user ? this.mapToUser(user) : undefined;
  }

  async findByEmailContaining(
    _ctx: Ctx,
    searchTerm: string,
  ): Promise<User[]> {
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

  async getSellers(_ctx: Ctx): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: {
        level: {
          in: ['Seller', 'VerifiedSeller'],
        },
      },
    });
    return users.map((u) => this.mapToUser(u));
  }

  async add(_ctx: Ctx, userData: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        publicName: userData.publicName,
        password: userData.password,
        role: userData.role,
        level: userData.level,
        status: userData.status ?? 'Enabled',
        imageId: userData.imageId,
        phone: userData.phone,
        country: userData.country || 'Germany',
        currency: userData.currency || 'EUR',
        language: this.mapLanguageToDb(userData.language),
        address: userData.address ? (userData.address as object) : undefined,
        emailVerified: userData.emailVerified,
        phoneVerified: userData.phoneVerified,
        tosAcceptedAt: userData.tosAcceptedAt,
        identityVerification: userData.identityVerification
          ? this.serializeIdentityVerification(userData.identityVerification)
          : undefined,
        bankAccount: userData.bankAccount
          ? (userData.bankAccount as object)
          : undefined,
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
    } catch {
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
    } catch {
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
      if (updates.publicName !== undefined) data.publicName = updates.publicName;
      if (updates.address !== undefined) data.address = updates.address as object;
      if (updates.imageId !== undefined) data.imageId = updates.imageId;

      const user = await this.prisma.user.update({
        where: { id: userId },
        data,
      });
      return this.mapToUser(user);
    } catch {
      return undefined;
    }
  }

  async updateLevel(
    _ctx: Ctx,
    userId: string,
    level: UserLevel,
  ): Promise<User | undefined> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { level },
      });
      return this.mapToUser(user);
    } catch {
      return undefined;
    }
  }

  async updateToVerifiedSeller(
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
          level: 'VerifiedSeller',
          identityVerification:
            this.serializeIdentityVerification(identityVerification),
        },
      });
      return this.mapToUser(user);
    } catch {
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
      level: prismaUser.level as UserLevel,
      status: prismaUser.status as UserStatus,
      publicName: prismaUser.publicName,
      imageId: prismaUser.imageId ?? 'default',
      phone: prismaUser.phone ?? undefined,
      password: prismaUser.password,
      country: prismaUser.country,
      currency: prismaUser.currency as User['currency'],
      language: this.mapLanguageFromDb(prismaUser.language),
      address: prismaUser.address
        ? (prismaUser.address as unknown as UserAddress)
        : undefined,
      emailVerified: prismaUser.emailVerified,
      phoneVerified: prismaUser.phoneVerified,
      tosAcceptedAt: prismaUser.tosAcceptedAt ?? undefined,
      identityVerification: prismaUser.identityVerification
        ? this.parseIdentityVerification(prismaUser.identityVerification)
        : undefined,
      bankAccount: prismaUser.bankAccount
        ? (prismaUser.bankAccount as unknown as BankAccount)
        : undefined,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
    };
  }

  private mapLanguageToDb(
    language: Language,
  ): 'es' | 'en' {
    return language === Language.ES ? 'es' : 'en';
  }

  private mapLanguageFromDb(
    dbLanguage: 'es' | 'en',
  ): Language {
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

  private serializeIdentityVerification(
    iv: IdentityVerification,
  ): object {
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
