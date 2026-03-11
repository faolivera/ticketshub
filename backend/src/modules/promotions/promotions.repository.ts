import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import {
  type Promotion,
  PromotionStatus,
  type PromotionType,
} from './promotions.domain';
import type {
  IPromotionsRepository,
  ListPromotionsFilters,
} from './promotions.repository.interface';
import {
  PromotionStatus as PrismaPromotionStatus,
  PromotionType as PrismaPromotionType,
} from '@prisma/client';

@Injectable()
export class PromotionsRepository
  extends BaseRepository
  implements IPromotionsRepository
{
  private readonly logger = new ContextLogger(PromotionsRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private mapStatusFromDb(s: PrismaPromotionStatus): PromotionStatus {
    return s === PrismaPromotionStatus.active
      ? PromotionStatus.Active
      : PromotionStatus.Inactive;
  }

  private mapStatusToDb(s: PromotionStatus): PrismaPromotionStatus {
    return s === PromotionStatus.Active
      ? PrismaPromotionStatus.active
      : PrismaPromotionStatus.inactive;
  }

  private mapTypeFromDb(t: PrismaPromotionType): PromotionType {
    return t as unknown as PromotionType;
  }

  private mapTypeToDb(t: PromotionType): PrismaPromotionType {
    return t as unknown as PrismaPromotionType;
  }

  private mapToDomain(row: {
    id: string;
    userId: string;
    name: string;
    type: PrismaPromotionType;
    config: unknown;
    maxUsages: number;
    usedCount: number;
    usedInListingIds: unknown;
    status: PrismaPromotionStatus;
    validUntil: Date | null;
    promotionCodeId: string | null;
    createdAt: Date;
    createdBy: string;
  }): Promotion {
    const usedInListingIds = Array.isArray(row.usedInListingIds)
      ? (row.usedInListingIds as string[])
      : [];
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: this.mapTypeFromDb(row.type),
      config: row.config as Promotion['config'],
      maxUsages: row.maxUsages,
      usedCount: row.usedCount,
      usedInListingIds,
      status: this.mapStatusFromDb(row.status),
      validUntil: row.validUntil,
      promotionCodeId: row.promotionCodeId ?? undefined,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
    };
  }

  async create(
    ctx: Ctx,
    promotion: Omit<Promotion, 'id' | 'createdAt'>,
  ): Promise<Promotion> {
    this.logger.debug(ctx, 'create');
    const client = this.getClient(ctx);
    const id = crypto.randomUUID();
    const created = await client.promotion.create({
      data: {
        id,
        userId: promotion.userId,
        name: promotion.name,
        type: this.mapTypeToDb(promotion.type),
        config: promotion.config as object,
        maxUsages: promotion.maxUsages,
        usedCount: promotion.usedCount,
        usedInListingIds: promotion.usedInListingIds ?? [],
        status: this.mapStatusToDb(promotion.status),
        validUntil: promotion.validUntil ?? undefined,
        promotionCodeId: promotion.promotionCodeId ?? undefined,
        createdBy: promotion.createdBy,
      },
    });
    return this.mapToDomain(created);
  }

  async findById(ctx: Ctx, id: string): Promise<Promotion | undefined> {
    this.logger.debug(ctx, 'findById', { id });
    const client = this.getClient(ctx);
    const row = await client.promotion.findUnique({ where: { id } });
    return row ? this.mapToDomain(row) : undefined;
  }

  async findActiveByUserIdAndType(
    ctx: Ctx,
    userId: string,
    type: PromotionType,
  ): Promise<Promotion | undefined> {
    this.logger.debug(ctx, 'findActiveByUserIdAndType', { userId, type });
    const client = this.getClient(ctx);
    const now = new Date();
    const rows = await client.promotion.findMany({
      where: {
        userId,
        type: this.mapTypeToDb(type),
        status: PrismaPromotionStatus.active,
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    for (const row of rows) {
      const promo = this.mapToDomain(row);
      if (promo.maxUsages === 0 || promo.usedCount < promo.maxUsages) {
        return promo;
      }
    }
    return undefined;
  }

  async list(ctx: Ctx, filters?: ListPromotionsFilters): Promise<Promotion[]> {
    this.logger.debug(ctx, 'list', { filters });
    const client = this.getClient(ctx);
    const where: {
      status?: PrismaPromotionStatus;
      type?: PrismaPromotionType;
      userId?: string;
    } = {};
    if (filters?.status) where.status = this.mapStatusToDb(filters.status);
    if (filters?.type) where.type = this.mapTypeToDb(filters.type);
    if (filters?.userId) where.userId = filters.userId;
    const rows = await client.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async updateStatus(
    ctx: Ctx,
    id: string,
    status: PromotionStatus,
  ): Promise<Promotion | undefined> {
    this.logger.debug(ctx, 'updateStatus', { id, status });
    const client = this.getClient(ctx);
    const updated = await client.promotion.update({
      where: { id },
      data: { status: this.mapStatusToDb(status) },
    });
    return this.mapToDomain(updated);
  }

  async incrementUsedAndAddListingId(
    ctx: Ctx,
    id: string,
    listingId: string,
  ): Promise<Promotion | undefined> {
    this.logger.debug(ctx, 'incrementUsedAndAddListingId', { id, listingId });
    const client = this.getClient(ctx);
    const existing = await client.promotion.findUnique({ where: { id } });
    if (!existing) return undefined;
    const usedInListingIds = Array.isArray(existing.usedInListingIds)
      ? [...(existing.usedInListingIds as string[]), listingId]
      : [listingId];
    const updated = await client.promotion.update({
      where: { id },
      data: {
        usedCount: existing.usedCount + 1,
        usedInListingIds,
      },
    });
    return this.mapToDomain(updated);
  }

  async deactivateByUserIdAndType(
    ctx: Ctx,
    userId: string,
    type: PromotionType,
  ): Promise<number> {
    this.logger.debug(ctx, 'deactivateByUserIdAndType', { userId, type });
    const client = this.getClient(ctx);
    const result = await client.promotion.updateMany({
      where: {
        userId,
        type: this.mapTypeToDb(type),
        status: PrismaPromotionStatus.active,
      },
      data: { status: PrismaPromotionStatus.inactive },
    });
    return result.count;
  }
}
