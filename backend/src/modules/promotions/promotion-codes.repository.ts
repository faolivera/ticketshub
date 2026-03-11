import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type { PromotionCode, PromotionConfigTarget } from './promotions.domain';
import type { IPromotionCodesRepository } from './promotion-codes.repository.interface';
import { PromotionConfigTarget as PrismaPromotionConfigTarget } from '@prisma/client';

@Injectable()
export class PromotionCodesRepository
  extends BaseRepository
  implements IPromotionCodesRepository
{
  private readonly logger = new ContextLogger(PromotionCodesRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private mapTargetFromDb(t: PrismaPromotionConfigTarget): PromotionConfigTarget {
    return t as unknown as PromotionConfigTarget;
  }

  private mapTargetToDb(t: PromotionConfigTarget): PrismaPromotionConfigTarget {
    return t as unknown as PrismaPromotionConfigTarget;
  }

  private mapToDomain(row: {
    id: string;
    code: string;
    promotionConfig: unknown;
    target: PrismaPromotionConfigTarget;
    maxUsages: number;
    usedCount: number;
    createdAt: Date;
    createdBy: string;
  }): PromotionCode {
    return {
      id: row.id,
      code: row.code,
      promotionConfig: row.promotionConfig as PromotionCode['promotionConfig'],
      target: this.mapTargetFromDb(row.target),
      maxUsages: row.maxUsages,
      usedCount: row.usedCount,
      createdAt: row.createdAt,
      createdBy: row.createdBy,
    };
  }

  async create(
    ctx: Ctx,
    data: Omit<PromotionCode, 'id' | 'createdAt'>,
  ): Promise<PromotionCode> {
    this.logger.debug(ctx, 'create');
    const client = this.getClient(ctx);
    const id = crypto.randomUUID();
    const created = await client.promotionCode.create({
      data: {
        id,
        code: data.code.trim().toUpperCase(),
        promotionConfig: data.promotionConfig as object,
        target: this.mapTargetToDb(data.target),
        maxUsages: data.maxUsages,
        usedCount: data.usedCount,
        createdBy: data.createdBy,
      },
    });
    return this.mapToDomain(created);
  }

  async findByCode(ctx: Ctx, code: string): Promise<PromotionCode | undefined> {
    this.logger.debug(ctx, 'findByCode', { code: code?.substring(0, 4) + '…' });
    const client = this.getClient(ctx);
    const normalized = code?.trim().toUpperCase() ?? '';
    const row = await client.promotionCode.findUnique({
      where: { code: normalized },
    });
    return row ? this.mapToDomain(row) : undefined;
  }

  async findById(ctx: Ctx, id: string): Promise<PromotionCode | undefined> {
    this.logger.debug(ctx, 'findById', { id });
    const client = this.getClient(ctx);
    const row = await client.promotionCode.findUnique({ where: { id } });
    return row ? this.mapToDomain(row) : undefined;
  }

  async list(ctx: Ctx): Promise<PromotionCode[]> {
    this.logger.debug(ctx, 'list');
    const client = this.getClient(ctx);
    const rows = await client.promotionCode.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapToDomain(r));
  }

  async incrementUsedCount(
    ctx: Ctx,
    id: string,
  ): Promise<PromotionCode | undefined> {
    this.logger.debug(ctx, 'incrementUsedCount', { id });
    const client = this.getClient(ctx);
    const existing = await client.promotionCode.findUnique({ where: { id } });
    if (!existing) return undefined;
    const updated = await client.promotionCode.update({
      where: { id },
      data: { usedCount: existing.usedCount + 1 },
    });
    return this.mapToDomain(updated);
  }
}
