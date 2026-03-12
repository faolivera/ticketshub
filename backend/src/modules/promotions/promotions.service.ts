import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PROMOTIONS_REPOSITORY } from './promotions.repository.interface';
import { PROMOTION_CODES_REPOSITORY } from './promotion-codes.repository.interface';
import type {
  IPromotionsRepository,
  ListPromotionsFilters,
} from './promotions.repository.interface';
import type { IPromotionCodesRepository } from './promotion-codes.repository.interface';
import { PlatformConfigService } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { ContextLogger } from '../../common/logger/context-logger';
import { VerificationHelper, SellerTier } from '../../common/utils/verification-helper';
import type { Ctx } from '../../common/types/context';
import {
  PromotionType,
  PromotionStatus,
  type Promotion,
  type PromotionSnapshot,
  type PromotionConfigTarget,
} from './promotions.domain';
import type {
  CreatePromotionRequest,
  CreatePromotionResponse,
  ListPromotionsResponse,
  PromotionListItem,
  UpdatePromotionStatusRequest,
  ActivePromotionSummary,
  ClaimPromotionCodeResponse,
  CreatePromotionCodeRequest,
  ListPromotionCodesResponse,
} from './promotions.api';

@Injectable()
export class PromotionsService {
  private readonly logger = new ContextLogger(PromotionsService.name);

  constructor(
    @Inject(PROMOTIONS_REPOSITORY)
    private readonly repository: IPromotionsRepository,
    @Inject(PROMOTION_CODES_REPOSITORY)
    private readonly promotionCodesRepository: IPromotionCodesRepository,
    private readonly platformConfigService: PlatformConfigService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create one promotion per user (by userIds or emails). Validates feePercentage <= global.
   * Deactivates any existing active promotion of the same type for each user before creating.
   */
  async create(
    ctx: Ctx,
    body: CreatePromotionRequest,
    createdBy: string,
  ): Promise<CreatePromotionResponse> {
    const userIds = await this.resolveUserIds(ctx, body);
    if (userIds.length === 0) {
      throw new BadRequestException(
        'At least one valid user must be specified (userIds or emails)',
      );
    }

    const platformConfig =
      await this.platformConfigService.getPlatformConfig(ctx);
    if (
      body.config.feePercentage > platformConfig.sellerPlatformFeePercentage
    ) {
      throw new BadRequestException(
        `Promotion fee percentage (${body.config.feePercentage}%) cannot exceed platform seller fee (${platformConfig.sellerPlatformFeePercentage}%)`,
      );
    }

    const validUntil = body.validUntil ? new Date(body.validUntil) : null;

    await this.repository.deactivateByUserIdsAndType(
      ctx,
      userIds,
      body.type,
    );

    const created: Promotion[] = [];
    for (const userId of userIds) {
      const promotion = await this.repository.create(ctx, {
        userId,
        name: body.name,
        type: body.type,
        config: body.config,
        maxUsages: body.maxUsages,
        usedCount: 0,
        usedInListingIds: [],
        status: PromotionStatus.Active,
        validUntil,
        createdBy,
      });
      created.push(promotion);
    }

    this.logger.log(
      ctx,
      `Created ${created.length} promotion(s) for type ${body.type}`,
    );
    return created;
  }

  private async resolveUserIds(
    ctx: Ctx,
    body: CreatePromotionRequest,
  ): Promise<string[]> {
    if (body.userIds?.length) {
      const users = await this.usersService.findByIds(ctx, body.userIds);
      return users.map((u) => u.id);
    }
    if (body.emails?.length) {
      const users = await this.usersService.findByEmails(ctx, body.emails);
      const foundEmails = new Set(
        users.map((u) => u.email.toLowerCase()),
      );
      for (const email of body.emails) {
        const trimmed = email.trim();
        if (!trimmed) continue;
        if (!foundEmails.has(trimmed.toLowerCase())) {
          this.logger.warn(ctx, `No user found for email: ${trimmed}`);
        }
      }
      return [...new Set(users.map((u) => u.id))];
    }
    return [];
  }

  /**
   * Get the active promotion for a user and type (e.g. for sell-ticket or listing creation).
   * Returns the first active one with remaining usages.
   */
  async getActiveForUser(
    ctx: Ctx,
    userId: string,
    type: PromotionType = PromotionType.SELLER_DISCOUNTED_FEE,
  ): Promise<Promotion | null> {
    const promotion = await this.repository.findActiveByUserIdAndType(
      ctx,
      userId,
      type,
    );
    return promotion ?? null;
  }

  /**
   * Get active promotion summary for BFF sell-ticket config (no sensitive data).
   */
  async getActivePromotionSummary(
    ctx: Ctx,
    userId: string,
    type: PromotionType = PromotionType.SELLER_DISCOUNTED_FEE,
  ): Promise<ActivePromotionSummary | null> {
    const promotion = await this.getActiveForUser(ctx, userId, type);
    if (!promotion) return null;
    return {
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      config: promotion.config,
    };
  }

  /**
   * List promotions for admin (with optional filters). Enriches with user email.
   */
  async list(
    ctx: Ctx,
    filters?: ListPromotionsFilters,
  ): Promise<ListPromotionsResponse> {
    const promotions = await this.repository.list(ctx, filters);
    const userIds = [...new Set(promotions.map((p) => p.userId))];
    const users = await this.usersService.findByIds(ctx, userIds);
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]));

    return promotions.map((p) => ({
      id: p.id,
      userId: p.userId,
      userEmail: emailByUserId.get(p.userId),
      name: p.name,
      type: p.type,
      config: p.config,
      maxUsages: p.maxUsages,
      usedCount: p.usedCount,
      usedInListingIds: p.usedInListingIds,
      status: p.status,
      validUntil: p.validUntil?.toISOString() ?? null,
      promotionCodeId: p.promotionCodeId,
      createdAt: p.createdAt.toISOString(),
      createdBy: p.createdBy,
    })) as PromotionListItem[];
  }

  /**
   * Update promotion status. When activating, deactivates other promotions of same type for that user.
   */
  async updateStatus(
    ctx: Ctx,
    id: string,
    body: UpdatePromotionStatusRequest,
  ): Promise<Promotion> {
    const existing = await this.repository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundException('Promotion not found');
    }
    if (body.status === PromotionStatus.Active) {
      await this.repository.deactivateByUserIdAndType(
        ctx,
        existing.userId,
        existing.type,
      );
    }
    const updated = await this.repository.updateStatus(ctx, id, body.status);
    if (!updated) {
      throw new NotFoundException('Promotion not found');
    }
    return updated;
  }

  /**
   * Increment usedCount and add listingId to usedInListingIds. Call within same transaction as listing creation.
   */
  async incrementUsedAndAddListingId(
    ctx: Ctx,
    promotionId: string,
    listingId: string,
  ): Promise<void> {
    const updated = await this.repository.incrementUsedAndAddListingId(
      ctx,
      promotionId,
      listingId,
    );
    if (!updated) {
      this.logger.error(
        ctx,
        `Failed to increment usage for promotion ${promotionId} and listing ${listingId}`,
      );
      throw new BadRequestException('Failed to apply promotion usage');
    }
  }

  /**
   * Build snapshot to store on a listing when applying a promotion.
   */
  toSnapshot(promotion: Promotion): PromotionSnapshot {
    return {
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      config: promotion.config,
    };
  }

  /**
   * Claim a promotion code as buyer or seller. Validates code target vs user role/verification,
   * then creates a promotion for the user and increments the code's used count.
   */
  async claimPromotionCode(
    ctx: Ctx,
    role: 'buyer' | 'seller',
    code: string,
    userId: string,
  ): Promise<ClaimPromotionCodeResponse> {
    const promotionCode = await this.promotionCodesRepository.findByCode(
      ctx,
      code,
    );
    if (!promotionCode) {
      throw new NotFoundException('Promotion code not found');
    }

    if (
      promotionCode.maxUsages > 0 &&
      promotionCode.usedCount >= promotionCode.maxUsages
    ) {
      throw new BadRequestException('Promotion code has no remaining usages');
    }

    const now = new Date();
    if (
      promotionCode.validUntil != null &&
      promotionCode.validUntil < now
    ) {
      throw new BadRequestException('Promotion code has expired');
    }

    const user = await this.usersService.findById(ctx, userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const target = promotionCode.target;

    if (role === 'buyer') {
      if (target !== 'buyer' && target !== 'verified_buyer') {
        throw new ForbiddenException(
          'This promotion code is not available for buyers',
        );
      }
      if (target === 'verified_buyer') {
        if (!VerificationHelper.hasV1(user) || !VerificationHelper.hasV2(user)) {
          throw new ForbiddenException(
            'This promotion code requires a verified account (email and phone)',
          );
        }
      }
    } else {
      if (target !== 'seller' && target !== 'verified_seller') {
        throw new ForbiddenException(
          'This promotion code is not available for sellers',
        );
      }
      if (!VerificationHelper.canSell(user)) {
        throw new ForbiddenException(
          'Only sellers with verified email and phone can claim this code',
        );
      }
      if (target === 'verified_seller') {
        if (VerificationHelper.sellerTier(user) !== SellerTier.VERIFIED_SELLER) {
          throw new ForbiddenException(
            'This promotion code requires a verified seller account (identity and bank verified)',
          );
        }
      }
    }

    const platformConfig =
      await this.platformConfigService.getPlatformConfig(ctx);
    const config = promotionCode.promotionConfig as {
      type: PromotionType;
      config: { feePercentage: number };
      maxUsages: number;
      usedInListingIds: string[];
      status: PromotionStatus;
      validUntil: Date | null;
    };
    if (
      config.config.feePercentage > platformConfig.sellerPlatformFeePercentage
    ) {
      throw new BadRequestException(
        `Promotion fee percentage cannot exceed platform seller fee (${platformConfig.sellerPlatformFeePercentage}%)`,
      );
    }

    const validUntil = config.validUntil ?? null;

    const promotion = await this.repository.create(ctx, {
      userId,
      name: promotionCode.code,
      type: config.type,
      config: config.config,
      maxUsages: config.maxUsages,
      usedCount: 0,
      usedInListingIds: [],
      status: PromotionStatus.Active,
      validUntil,
      createdBy: userId,
      promotionCodeId: promotionCode.id,
    });

    await this.promotionCodesRepository.incrementUsedCount(ctx, promotionCode.id);

    this.logger.log(
      ctx,
      `User ${userId} claimed promotion code ${promotionCode.code} (${promotionCode.id})`,
    );
    return promotion;
  }

  /**
   * List all promotion codes (admin).
   */
  async listPromotionCodes(ctx: Ctx): Promise<ListPromotionCodesResponse> {
    const codes = await this.promotionCodesRepository.list(ctx);
    return codes.map((c) => {
      const configValidUntil = c.promotionConfig.validUntil;
      const configValidUntilStr =
        configValidUntil == null
          ? null
          : typeof configValidUntil === 'string'
            ? configValidUntil
            : configValidUntil instanceof Date
              ? configValidUntil.toISOString()
              : null;
      const codeValidUntilStr =
        c.validUntil == null ? null : c.validUntil.toISOString();
      return {
        id: c.id,
        code: c.code,
        target: c.target,
        promotionConfig: {
          type: c.promotionConfig.type,
          config: c.promotionConfig.config,
          maxUsages: c.promotionConfig.maxUsages,
          validUntil: configValidUntilStr,
        },
        maxUsages: c.maxUsages,
        usedCount: c.usedCount,
        validUntil: codeValidUntilStr,
        createdAt: c.createdAt.toISOString(),
        createdBy: c.createdBy,
      };
    });
  }

  /**
   * Create a promotion code (admin).
   */
  async createPromotionCode(
    ctx: Ctx,
    body: CreatePromotionCodeRequest,
    createdBy: string,
  ): Promise<{ id: string; code: string }> {
    const platformConfig =
      await this.platformConfigService.getPlatformConfig(ctx);
    if (
      body.promotionConfig.config.feePercentage >
      platformConfig.sellerPlatformFeePercentage
    ) {
      throw new BadRequestException(
        `Promotion fee percentage (${body.promotionConfig.config.feePercentage}%) cannot exceed platform seller fee (${platformConfig.sellerPlatformFeePercentage}%)`,
      );
    }

    const existing = await this.promotionCodesRepository.findByCode(
      ctx,
      body.code,
    );
    if (existing) {
      throw new BadRequestException(
        `Promotion code "${body.code}" already exists`,
      );
    }

    const promotionConfigValidUntil = body.promotionConfig.validUntil
      ? new Date(body.promotionConfig.validUntil)
      : null;
    const codeValidUntil = body.validUntil
      ? new Date(body.validUntil)
      : null;
    const promotionCode = await this.promotionCodesRepository.create(ctx, {
      code: body.code,
      promotionConfig: {
        type: body.promotionConfig.type,
        config: body.promotionConfig.config,
        maxUsages: body.promotionConfig.maxUsages,
        usedCount: 0,
        usedInListingIds: [],
        status: PromotionStatus.Active,
        validUntil: promotionConfigValidUntil,
      },
      target: body.target as PromotionConfigTarget,
      maxUsages: body.maxUsages,
      usedCount: 0,
      validUntil: codeValidUntil,
      createdBy,
    });

    this.logger.log(ctx, `Created promotion code ${promotionCode.code}`);
    return { id: promotionCode.id, code: promotionCode.code };
  }
}
