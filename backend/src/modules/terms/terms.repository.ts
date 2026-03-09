import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  TermsVersion as PrismaTermsVersion,
  UserTermsAcceptance as PrismaUserTermsAcceptance,
  UserTermsState as PrismaUserTermsState,
  TermsUserType as PrismaTermsUserType,
  TermsStatus as PrismaTermsStatus,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type {
  TermsVersion,
  UserTermsAcceptance,
  UserTermsState,
} from './terms.domain';
import {
  TermsUserType,
  TermsChangeType,
  TermsStatus,
  AcceptanceStatus,
  AcceptanceMethod,
} from './terms.domain';
import type { ITermsRepository } from './terms.repository.interface';

@Injectable()
export class TermsRepository implements ITermsRepository {
  private readonly logger = new ContextLogger(TermsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findVersionById(
    _ctx: Ctx,
    id: string,
  ): Promise<TermsVersion | undefined> {
    this.logger.debug(_ctx, 'findVersionById', { id });
    const version = await this.prisma.termsVersion.findUnique({
      where: { id },
    });
    return version ? this.mapToTermsVersion(version) : undefined;
  }

  async findActiveByUserType(
    _ctx: Ctx,
    userType: TermsUserType,
  ): Promise<TermsVersion | undefined> {
    const version = await this.prisma.termsVersion.findFirst({
      where: {
        userType: this.mapUserTypeToDb(userType),
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });
    return version ? this.mapToTermsVersion(version) : undefined;
  }

  async findAcceptance(
    _ctx: Ctx,
    userId: string,
    termsVersionId: string,
  ): Promise<UserTermsAcceptance | undefined> {
    this.logger.debug(_ctx, 'findAcceptance', { userId, termsVersionId });
    const acceptance = await this.prisma.userTermsAcceptance.findUnique({
      where: {
        userId_termsVersionId: { userId, termsVersionId },
      },
    });
    return acceptance ? this.mapToUserTermsAcceptance(acceptance) : undefined;
  }

  async findAcceptancesByUser(
    _ctx: Ctx,
    userId: string,
    userType?: TermsUserType,
  ): Promise<UserTermsAcceptance[]> {
    this.logger.debug(_ctx, 'findAcceptancesByUser', { userId, userType });
    const acceptances = await this.prisma.userTermsAcceptance.findMany({
      where: {
        userId,
        ...(userType && { userType: this.mapUserTypeToDb(userType) }),
      },
    });
    return acceptances.map((a) => this.mapToUserTermsAcceptance(a));
  }

  async createAcceptance(
    _ctx: Ctx,
    data: UserTermsAcceptance,
  ): Promise<UserTermsAcceptance> {
    this.logger.debug(_ctx, 'createAcceptance', { id: data.id, userId: data.userId });
    const acceptance = await this.prisma.userTermsAcceptance.create({
      data: {
        id: data.id,
        userId: data.userId,
        termsVersionId: data.termsVersionId,
        userType: this.mapUserTypeToDb(data.userType),
        acceptedAt: data.respondedAt ?? new Date(),
      },
    });
    return this.mapToUserTermsAcceptance(acceptance);
  }

  async findUserTermsState(
    _ctx: Ctx,
    userId: string,
    userType: TermsUserType,
  ): Promise<UserTermsState | undefined> {
    this.logger.debug(_ctx, 'findUserTermsState', { userId, userType });
    const state = await this.prisma.userTermsState.findUnique({
      where: {
        userId_userType: { userId, userType: this.mapUserTypeToDb(userType) },
      },
    });
    return state ? this.mapToUserTermsState(state) : undefined;
  }

  async upsertUserTermsState(
    _ctx: Ctx,
    data: UserTermsState,
  ): Promise<UserTermsState> {
    this.logger.debug(_ctx, 'upsertUserTermsState', { userId: data.userId, userType: data.userType });
    const dbUserType = this.mapUserTypeToDb(data.userType);
    const state = await this.prisma.userTermsState.upsert({
      where: {
        userId_userType: { userId: data.userId, userType: dbUserType },
      },
      create: {
        id: data.id,
        userId: data.userId,
        userType: dbUserType,
        currentTermsVersionId: data.currentTermsVersionId,
        acceptedTermsVersionId: data.lastAcceptedVersionId,
        needsAcceptance: !data.isCompliant,
      },
      update: {
        currentTermsVersionId: data.currentTermsVersionId,
        acceptedTermsVersionId: data.lastAcceptedVersionId,
        needsAcceptance: !data.isCompliant,
      },
    });
    return this.mapToUserTermsState(state);
  }

  private mapUserTypeToDb(userType: TermsUserType): PrismaTermsUserType {
    return userType === TermsUserType.Buyer ? 'buyer' : 'seller';
  }

  private mapUserTypeFromDb(dbUserType: PrismaTermsUserType): TermsUserType {
    return dbUserType === 'buyer' ? TermsUserType.Buyer : TermsUserType.Seller;
  }

  private mapStatusFromDb(dbStatus: PrismaTermsStatus): TermsStatus {
    switch (dbStatus) {
      case 'draft':
        return TermsStatus.Draft;
      case 'active':
        return TermsStatus.Active;
      case 'archived':
        return TermsStatus.Superseded;
      default:
        return TermsStatus.Draft;
    }
  }

  private parseVersion(versionStr: string): {
    major: number;
    minor: number;
    patch: number;
  } {
    const parts = versionStr.split('.');
    return {
      major: parseInt(parts[0] || '1', 10),
      minor: parseInt(parts[1] || '0', 10),
      patch: parseInt(parts[2] || '0', 10),
    };
  }

  private mapToTermsVersion(prismaVersion: PrismaTermsVersion): TermsVersion {
    const { major, minor, patch } = this.parseVersion(prismaVersion.version);
    return {
      id: prismaVersion.id,
      userType: this.mapUserTypeFromDb(prismaVersion.userType),
      versionMajor: major,
      versionMinor: minor,
      versionPatch: patch,
      versionLabel: prismaVersion.version,
      changeType: TermsChangeType.Major,
      status: this.mapStatusFromDb(prismaVersion.status),
      contentUrl: `terms_${prismaVersion.id}.pdf`,
      contentHash: '',
      contentSummary: prismaVersion.content,
      notificationDate: prismaVersion.createdAt,
      effectiveDate: prismaVersion.publishedAt ?? prismaVersion.createdAt,
      gracePeriodEndsAt: null,
      hardDeadlineAt: null,
      previousVersionId: null,
      createdByUserId: '',
      createdAt: prismaVersion.createdAt,
      publishedAt: prismaVersion.publishedAt,
    };
  }

  private mapToUserTermsAcceptance(
    prismaAcceptance: PrismaUserTermsAcceptance,
  ): UserTermsAcceptance {
    return {
      id: prismaAcceptance.id,
      userId: prismaAcceptance.userId,
      termsVersionId: prismaAcceptance.termsVersionId,
      userType: this.mapUserTypeFromDb(prismaAcceptance.userType),
      status: AcceptanceStatus.Accepted,
      acceptanceMethod: AcceptanceMethod.Checkbox,
      ipAddress: null,
      userAgent: null,
      notifiedAt: prismaAcceptance.acceptedAt,
      respondedAt: prismaAcceptance.acceptedAt,
      expiresAt: null,
      createdAt: prismaAcceptance.acceptedAt,
    };
  }

  private mapToUserTermsState(
    prismaState: PrismaUserTermsState,
  ): UserTermsState {
    return {
      id: prismaState.id,
      userId: prismaState.userId,
      userType: this.mapUserTypeFromDb(prismaState.userType),
      currentTermsVersionId: prismaState.currentTermsVersionId ?? '',
      lastAcceptedVersionId: prismaState.acceptedTermsVersionId,
      lastAcceptedAt: null,
      isCompliant: !prismaState.needsAcceptance,
      canOperate: true,
      requiresAction: prismaState.needsAcceptance,
      actionDeadline: null,
      updatedAt: prismaState.updatedAt,
    };
  }
}
