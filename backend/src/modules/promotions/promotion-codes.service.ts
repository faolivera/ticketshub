import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PROMOTION_CODES_REPOSITORY } from './promotion-codes.repository.interface';
import type { IPromotionCodesRepository } from './promotion-codes.repository.interface';
import { PlatformConfigService } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { ContextLogger } from '../../common/logger/context-logger';
import { VerificationHelper, SellerTier } from '../../common/utils/verification-helper';
import type { Ctx } from '../../common/types/context';
import {
  PromotionType,
  PromotionStatus,
  type PromotionCode,
  type PromotionConfigTarget,
  type InvalidPromotionCodeReason,
  type ValidationPromotionCodeResult,
} from './promotions.domain';
import type { User } from '../users/users.domain';
import type {
  CreatePromotionCodeRequest,
  UpdatePromotionCodeRequest,
  ListPromotionCodesResponse,
  PromotionCodeListItem,
  ClaimPromotionCodeResponse,
  CheckSellerPromotionCodeResponse,
} from './promotions.api';
import { PromotionsService } from './promotions.service';

@Injectable()
export class PromotionCodesService {
  private readonly logger = new ContextLogger(PromotionCodesService.name);

  constructor(
    @Inject(PROMOTION_CODES_REPOSITORY)
    private readonly promotionCodesRepository: IPromotionCodesRepository,
    private readonly promotionsService: PromotionsService,
    private readonly platformConfigService: PlatformConfigService,
    private readonly usersService: UsersService,
  ) {}


  /** Shared validation for claim: code exists, user exists, usages, expiry, not already claimed. */
  private async validatePromotionCodeForUser(
    ctx: Ctx,
    code: string,
    userId: string,
  ): Promise<ValidationPromotionCodeResult> {
    const trimmed = code.trim();
    const promotionCode =
      await this.promotionCodesRepository.findByCode(ctx, trimmed);
    if (!promotionCode) {
      return { status: 'invalid', reason: 'code_not_found' };
    }

    const user = await this.usersService.findById(ctx, userId);
    if (!user) {
      return { status: 'invalid', reason: 'user_not_found' };
    }

    if (
      promotionCode.maxUsages > 0 &&
      promotionCode.usedCount >= promotionCode.maxUsages
    ) {
      return { status: 'invalid', reason: 'no_remaining_usages' };
    }

    const now = new Date();
    if (
      promotionCode.validUntil != null &&
      promotionCode.validUntil < now
    ) {
      return { status: 'invalid', reason: 'expired' };
    }

    const alreadyClaimed = await this.promotionsService.hasUserClaimedPromotionCode(
      ctx,
      userId,
      promotionCode.id,
    );
    if (alreadyClaimed) {
      return { status: 'invalid', reason: 'already_claimed' };
    }

    return { status: 'valid', user, promotionCode };
  }

  private async validatePromotionCodeForSeller(
    ctx: Ctx,
    userId: string,
    code: string,
  ): Promise<ValidationPromotionCodeResult> {
    const userResult = await this.validatePromotionCodeForUser(ctx, code, userId);
    if(userResult.status !== 'valid') {
      return userResult;
    }
    const { user, promotionCode } = userResult;


    const target = promotionCode.target;
    if (target !== 'seller' && target !== 'verified_seller') {
      return { status: 'invalid', reason: 'wrong_target' };
    }
    if (!VerificationHelper.canSell(user)) {
      return { status: 'invalid', reason: 'seller_verification_required' };
    }
    if (target === 'verified_seller') {
      if (VerificationHelper.sellerTier(user) !== SellerTier.VERIFIED_SELLER) {
        return { status: 'invalid', reason: 'verified_seller_required' };
      }
    }
    return { status: 'valid', user, promotionCode };
  }

  private async validatePromotionCodeForBuyer(
    ctx: Ctx,
    userId: string,
    code: string,
  ): Promise<ValidationPromotionCodeResult> {
    const userResult = await this.validatePromotionCodeForUser(ctx, code, userId);
    if(userResult.status !== 'valid') {
      return userResult;
    }
    const { user, promotionCode } = userResult;
    const target = promotionCode.target;
    if (target !== 'buyer' && target !== 'verified_buyer') {
      return { status: 'invalid', reason: 'wrong_target' };
    }
    if (target === 'verified_buyer') {
      if (!VerificationHelper.hasV1(user) || !VerificationHelper.hasV2(user)) {
        return { status: 'invalid', reason: 'verified_buyer_required' };
      }
    }
    return { status: 'valid', user, promotionCode };
  }

  private getForbiddenMessageForReason(
    reason: InvalidPromotionCodeReason,
  ): string {
    switch (reason) {
      case 'wrong_target':
        return 'This promotion code is not available for your role';
      case 'seller_verification_required':
        return 'Only sellers with verified email and phone can claim this code';
      case 'verified_seller_required':
        return 'This promotion code requires a verified seller account (identity and bank verified)';
      case 'buyer_verification_required':
      case 'verified_buyer_required':
        return 'This promotion code requires a verified account (email and phone)';
      default:
        return 'You cannot claim this promotion code';
    }
  }

  /**
   * Check if a promotion code can be used by a seller (for sell-ticket step 6 preview).
   * Returns config only when: code exists, target is seller|verified_seller, not expired,
   * usedCount < maxUsages, and type is SELLER_DISCOUNTED_FEE. Does not claim; does not validate user verification.
   */
  async checkSellerPromotionCode(
    ctx: Ctx,
    code: string,
    userId: string
  ): Promise<CheckSellerPromotionCodeResponse | null> {
    const validationResult = await this.validatePromotionCodeForSeller(ctx, userId, code);
    if(validationResult.status !== 'valid') {
      return null;
    }

    const { promotionCode } = validationResult;

    const config = promotionCode.promotionConfig as {
      type: PromotionType;
      config: { feePercentage: number };
    };
    return {
      code: promotionCode.code,
      name: promotionCode.code,
      target: promotionCode.target,
      type: config.type,
      config: config.config,
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
    let user: User | null = null;
    let promotionCode: PromotionCode | null = null;
    let invalidReason: InvalidPromotionCodeReason | null = null;
    const validationResult = role === 'seller' ? await this.validatePromotionCodeForSeller(ctx, userId, code) : await this.validatePromotionCodeForBuyer(ctx, userId, code);
    if(validationResult.status !== 'valid') {
      const reason = this.getForbiddenMessageForReason(invalidReason);
      this.logger.warn(ctx, `User ${userId} tried to claim promotion code ${code} but failed validation: ${reason}`);
      throw new ForbiddenException(reason);
    } else {
      user = validationResult.user;
      promotionCode = validationResult.promotionCode;
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

    const promotion = await this.promotionsService.createFromPromotionCodeClaim(
      ctx,
      userId,
      promotionCode,
    );

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

  /**
   * Update a promotion code (admin).
   */
  async updatePromotionCode(
    ctx: Ctx,
    id: string,
    body: UpdatePromotionCodeRequest,
  ): Promise<PromotionCodeListItem> {
    const existing = await this.promotionCodesRepository.findById(ctx, id);
    if (!existing) {
      throw new NotFoundException('Promotion code not found');
    }

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

    const newCode = body.code.trim().toUpperCase();
    if (newCode !== existing.code) {
      const byCode =
        await this.promotionCodesRepository.findByCode(ctx, newCode);
      if (byCode) {
        throw new BadRequestException(
          `Promotion code "${newCode}" already exists`,
        );
      }
    }

    const promotionConfigValidUntil = body.promotionConfig.validUntil
      ? new Date(body.promotionConfig.validUntil)
      : null;
    const codeValidUntil = body.validUntil
      ? new Date(body.validUntil)
      : null;
    const updated = await this.promotionCodesRepository.update(ctx, id, {
      code: newCode,
      target: body.target as PromotionConfigTarget,
      promotionConfig: {
        type: body.promotionConfig.type,
        config: body.promotionConfig.config,
        maxUsages: body.promotionConfig.maxUsages,
        usedCount: existing.promotionConfig.usedCount,
        usedInListingIds: existing.promotionConfig.usedInListingIds,
        status: PromotionStatus.Active,
        validUntil: promotionConfigValidUntil,
      },
      maxUsages: body.maxUsages,
      validUntil: codeValidUntil,
    });

    if (!updated) {
      throw new NotFoundException('Promotion code not found');
    }

    this.logger.log(ctx, `Updated promotion code ${updated.code}`);
    const configValidUntil = updated.promotionConfig.validUntil;
    const configValidUntilStr =
      configValidUntil == null
        ? null
        : configValidUntil instanceof Date
          ? configValidUntil.toISOString()
          : null;
    const codeValidUntilStr =
      updated.validUntil == null ? null : updated.validUntil.toISOString();
    return {
      id: updated.id,
      code: updated.code,
      target: updated.target,
      promotionConfig: {
        type: updated.promotionConfig.type,
        config: updated.promotionConfig.config,
        maxUsages: updated.promotionConfig.maxUsages,
        validUntil: configValidUntilStr,
      },
      maxUsages: updated.maxUsages,
      usedCount: updated.usedCount,
      validUntil: codeValidUntilStr,
      createdAt: updated.createdAt.toISOString(),
      createdBy: updated.createdBy,
    };
  }
}
