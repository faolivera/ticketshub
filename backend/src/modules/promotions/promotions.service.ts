import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PROMOTIONS_REPOSITORY } from './promotions.repository.interface';
import type { IPromotionsRepository, ListPromotionsFilters } from './promotions.repository.interface';
import { PlatformConfigService } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import {
  PromotionType,
  PromotionStatus,
  type Promotion,
  type PromotionSnapshot,
} from './promotions.domain';
import type {
  CreatePromotionRequest,
  CreatePromotionResponse,
  ListPromotionsResponse,
  PromotionListItem,
  UpdatePromotionStatusRequest,
  ActivePromotionSummary,
} from './promotions.api';

@Injectable()
export class PromotionsService {
  private readonly logger = new ContextLogger(PromotionsService.name);

  constructor(
    @Inject(PROMOTIONS_REPOSITORY)
    private readonly repository: IPromotionsRepository,
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

    const platformConfig = await this.platformConfigService.getPlatformConfig(ctx);
    if (body.config.feePercentage > platformConfig.sellerPlatformFeePercentage) {
      throw new BadRequestException(
        `Promotion fee percentage (${body.config.feePercentage}%) cannot exceed platform seller fee (${platformConfig.sellerPlatformFeePercentage}%)`,
      );
    }

    const validUntil = body.validUntil ? new Date(body.validUntil) : null;
    const created: Promotion[] = [];

    for (const userId of userIds) {
      await this.repository.deactivateByUserIdAndType(ctx, userId, body.type);
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
      const ids: string[] = [];
      for (const email of body.emails) {
        const user = await this.usersService.findByEmail(ctx, email.trim());
        if (user) ids.push(user.id);
        else this.logger.warn(ctx, `No user found for email: ${email}`);
      }
      return [...new Set(ids)];
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
}
