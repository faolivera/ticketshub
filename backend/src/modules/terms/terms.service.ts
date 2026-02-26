import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TermsRepository } from './terms.repository';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  TermsVersion,
  UserTermsAcceptance,
  UserTermsState,
} from './terms.domain';
import {
  TermsUserType,
  AcceptanceMethod,
  AcceptanceStatus,
} from './terms.domain';
import type {
  GetCurrentTermsResponse,
  GetTermsStatusResponse,
  TermsComplianceStatus,
} from './terms.api';

@Injectable()
export class TermsService {
  private readonly logger: ContextLogger = new ContextLogger(TermsService.name);

  constructor(
    @Inject(TermsRepository)
    private readonly termsRepository: TermsRepository,
  ) {}

  async getCurrentTerms(
    ctx: Ctx,
    userType: TermsUserType,
  ): Promise<GetCurrentTermsResponse> {
    this.logger.log(ctx, `Getting current terms for userType: ${userType}`);

    const activeTerms = await this.termsRepository.findActiveByUserType(
      ctx,
      userType,
    );

    if (!activeTerms) {
      throw new NotFoundException(
        `No active terms found for user type: ${userType}`,
      );
    }

    return {
      id: activeTerms.id,
      userType: activeTerms.userType,
      versionLabel: activeTerms.versionLabel,
      contentUrl: activeTerms.contentUrl,
      contentSummary: activeTerms.contentSummary,
      effectiveDate: activeTerms.effectiveDate,
    };
  }

  async getTermsContent(ctx: Ctx, versionId: string): Promise<fs.ReadStream> {
    this.logger.log(ctx, `Getting terms content for versionId: ${versionId}`);

    const termsVersion = await this.termsRepository.findVersionById(
      ctx,
      versionId,
    );

    if (!termsVersion) {
      throw new NotFoundException(`Terms version not found: ${versionId}`);
    }

    const assetsPath = path.join(process.cwd(), 'assets', 'terms');
    const filePath = path.join(assetsPath, termsVersion.contentUrl);

    if (!fs.existsSync(filePath)) {
      this.logger.error(ctx, `Terms file not found at path: ${filePath}`);
      throw new NotFoundException('Terms document file not found');
    }

    return fs.createReadStream(filePath);
  }

  async getTermsFilePath(ctx: Ctx, versionId: string): Promise<string> {
    const termsVersion = await this.termsRepository.findVersionById(
      ctx,
      versionId,
    );

    if (!termsVersion) {
      throw new NotFoundException(`Terms version not found: ${versionId}`);
    }

    const assetsPath = path.join(process.cwd(), 'assets', 'terms');
    const filePath = path.join(assetsPath, termsVersion.contentUrl);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Terms document file not found');
    }

    return filePath;
  }

  async acceptTerms(
    ctx: Ctx,
    userId: string,
    versionId: string,
    method: AcceptanceMethod,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<UserTermsAcceptance> {
    this.logger.log(ctx, `User ${userId} accepting terms version ${versionId}`);

    const termsVersion = await this.termsRepository.findVersionById(
      ctx,
      versionId,
    );

    if (!termsVersion) {
      throw new NotFoundException(`Terms version not found: ${versionId}`);
    }

    const existingAcceptance = await this.termsRepository.findAcceptance(
      ctx,
      userId,
      versionId,
    );

    if (
      existingAcceptance &&
      existingAcceptance.status === AcceptanceStatus.Accepted
    ) {
      throw new BadRequestException('Terms already accepted');
    }

    const now = new Date();
    const acceptanceId = `acceptance-${userId}-${versionId}-${Date.now()}`;

    const acceptance: UserTermsAcceptance = {
      id: acceptanceId,
      userId,
      termsVersionId: versionId,
      userType: termsVersion.userType,
      status: AcceptanceStatus.Accepted,
      acceptanceMethod: method,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      notifiedAt: now,
      respondedAt: now,
      expiresAt: null,
      createdAt: now,
    };

    await this.termsRepository.createAcceptance(ctx, acceptance);

    await this.updateUserTermsState(ctx, userId, termsVersion, now);

    this.logger.log(ctx, `Terms acceptance recorded: ${acceptanceId}`);

    return acceptance;
  }

  private async updateUserTermsState(
    ctx: Ctx,
    userId: string,
    termsVersion: TermsVersion,
    acceptedAt: Date,
  ): Promise<void> {
    const stateId = `state-${userId}-${termsVersion.userType}`;

    const state: UserTermsState = {
      id: stateId,
      userId,
      userType: termsVersion.userType,
      currentTermsVersionId: termsVersion.id,
      lastAcceptedVersionId: termsVersion.id,
      lastAcceptedAt: acceptedAt,
      isCompliant: true,
      canOperate: true,
      requiresAction: false,
      actionDeadline: null,
      updatedAt: acceptedAt,
    };

    await this.termsRepository.upsertUserTermsState(ctx, state);
  }

  async getUserTermsStatus(
    ctx: Ctx,
    userId: string,
  ): Promise<GetTermsStatusResponse> {
    this.logger.log(ctx, `Getting terms status for user: ${userId}`);

    const buyerStatus = await this.getComplianceStatusForUserType(
      ctx,
      userId,
      TermsUserType.Buyer,
    );

    const sellerStatus = await this.getComplianceStatusForUserType(
      ctx,
      userId,
      TermsUserType.Seller,
    );

    return {
      buyer: buyerStatus,
      seller: sellerStatus,
    };
  }

  private async getComplianceStatusForUserType(
    ctx: Ctx,
    userId: string,
    userType: TermsUserType,
  ): Promise<TermsComplianceStatus | null> {
    const activeTerms = await this.termsRepository.findActiveByUserType(
      ctx,
      userType,
    );

    if (!activeTerms) {
      return null;
    }

    const userState = await this.termsRepository.findUserTermsState(
      ctx,
      userId,
      userType,
    );

    const isCompliant = userState?.lastAcceptedVersionId === activeTerms.id;

    return {
      userType,
      currentVersionId: activeTerms.id,
      currentVersionLabel: activeTerms.versionLabel,
      isCompliant,
      canOperate: isCompliant || !activeTerms.hardDeadlineAt,
      requiresAction: !isCompliant,
      actionDeadline: activeTerms.hardDeadlineAt,
      lastAcceptedAt: userState?.lastAcceptedAt || null,
    };
  }

  async hasAcceptedCurrentTerms(
    ctx: Ctx,
    userId: string,
    userType: TermsUserType,
  ): Promise<boolean> {
    const activeTerms = await this.termsRepository.findActiveByUserType(
      ctx,
      userType,
    );

    if (!activeTerms) {
      return true;
    }

    const userState = await this.termsRepository.findUserTermsState(
      ctx,
      userId,
      userType,
    );

    return userState?.lastAcceptedVersionId === activeTerms.id;
  }

  /**
   * Validate that the given termsVersionId is the current active version for the given userType.
   * Throws BadRequestException if validation fails.
   */
  async validateTermsVersion(
    ctx: Ctx,
    termsVersionId: string,
    expectedUserType: TermsUserType,
  ): Promise<void> {
    this.logger.log(
      ctx,
      `Validating terms version ${termsVersionId} for userType: ${expectedUserType}`,
    );

    const termsVersion = await this.termsRepository.findVersionById(
      ctx,
      termsVersionId,
    );

    if (!termsVersion) {
      throw new BadRequestException(`Invalid terms version: ${termsVersionId}`);
    }

    if (termsVersion.userType !== expectedUserType) {
      throw new BadRequestException(
        `Terms version ${termsVersionId} is not for ${expectedUserType} users`,
      );
    }

    const activeTerms = await this.termsRepository.findActiveByUserType(
      ctx,
      expectedUserType,
    );

    if (!activeTerms || activeTerms.id !== termsVersionId) {
      throw new BadRequestException(
        `Terms version ${termsVersionId} is not the current active version`,
      );
    }
  }
}
