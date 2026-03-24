import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';

export interface EventsRankingConfigRow {
  weightActiveListings: number;
  weightTransactions: number;
  weightProximity: number;
  weightPopular: number;
  jobIntervalMinutes: number;
  lastRunAt: Date | null;
  updatedAt: Date;
}

const CONFIG_ID = 'default';
const BATCH_SIZE = 100;

const DEFAULT_CONFIG = {
  weightActiveListings: 1,
  weightTransactions: 1,
  weightProximity: 0.5,
  weightPopular: 1,
  jobIntervalMinutes: 5,
} as const;

@Injectable()
export class EventScoringRepository {
  private readonly logger = new ContextLogger(EventScoringRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enqueue an event for scoring. One row per event (upsert by eventId).
   */
  async enqueueEvent(_ctx: Ctx, eventId: string): Promise<void> {
    this.logger.debug(_ctx, 'enqueueEvent', { eventId });
    await this.prisma.eventRequireScoring.upsert({
      where: { eventId },
      create: { eventId },
      update: { requestedAt: new Date() },
    });
  }

  /**
   * Get event IDs that need scoring, up to BATCH_SIZE. Returns in requestedAt order.
   */
  async getPendingEventIds(ctx: Ctx, limit: number = BATCH_SIZE): Promise<string[]> {
    this.logger.debug(ctx, 'getPendingEventIds', { limit });
    const rows = await this.prisma.eventRequireScoring.findMany({
      orderBy: { requestedAt: 'asc' },
      take: limit,
      select: { eventId: true },
    });
    return rows.map((r) => r.eventId);
  }

  /**
   * Remove events from the queue after scoring.
   */
  async removeFromQueue(ctx: Ctx, eventIds: string[]): Promise<void> {
    if (eventIds.length === 0) return;
    this.logger.debug(ctx, 'removeFromQueue', { count: eventIds.length });
    await this.prisma.eventRequireScoring.deleteMany({
      where: { eventId: { in: eventIds } },
    });
  }

  /**
   * Load ranking config (singleton row). Returns in-memory defaults if no row exists yet.
   */
  async getConfig(ctx: Ctx): Promise<EventsRankingConfigRow> {
    this.logger.debug(ctx, 'getConfig');
    const row = await this.prisma.eventsRankingConfig.findUnique({
      where: { id: CONFIG_ID },
    });
    if (!row) {
      return { ...DEFAULT_CONFIG, lastRunAt: null, updatedAt: new Date() };
    }
    return {
      weightActiveListings: row.weightActiveListings,
      weightTransactions: row.weightTransactions,
      weightProximity: row.weightProximity,
      weightPopular: row.weightPopular,
      jobIntervalMinutes: row.jobIntervalMinutes,
      lastRunAt: row.lastRunAt,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Update config and optionally lastRunAt.
   */
  async updateConfig(
    ctx: Ctx,
    data: Partial<{
      weightActiveListings: number;
      weightTransactions: number;
      weightProximity: number;
      weightPopular: number;
      jobIntervalMinutes: number;
      lastRunAt: Date | null;
    }>,
  ): Promise<EventsRankingConfigRow> {
    this.logger.debug(ctx, 'updateConfig');
    const row = await this.prisma.eventsRankingConfig.upsert({
      where: { id: CONFIG_ID },
      create: {
        id: CONFIG_ID,
        weightActiveListings: data.weightActiveListings ?? DEFAULT_CONFIG.weightActiveListings,
        weightTransactions: data.weightTransactions ?? DEFAULT_CONFIG.weightTransactions,
        weightProximity: data.weightProximity ?? DEFAULT_CONFIG.weightProximity,
        weightPopular: data.weightPopular ?? DEFAULT_CONFIG.weightPopular,
        jobIntervalMinutes: data.jobIntervalMinutes ?? DEFAULT_CONFIG.jobIntervalMinutes,
        lastRunAt: data.lastRunAt ?? null,
      },
      update: {
        ...(data.weightActiveListings !== undefined && { weightActiveListings: data.weightActiveListings }),
        ...(data.weightTransactions !== undefined && { weightTransactions: data.weightTransactions }),
        ...(data.weightProximity !== undefined && { weightProximity: data.weightProximity }),
        ...(data.weightPopular !== undefined && { weightPopular: data.weightPopular }),
        ...(data.jobIntervalMinutes !== undefined && { jobIntervalMinutes: data.jobIntervalMinutes }),
        ...(data.lastRunAt !== undefined && { lastRunAt: data.lastRunAt }),
      },
    });
    return {
      weightActiveListings: row.weightActiveListings,
      weightTransactions: row.weightTransactions,
      weightProximity: row.weightProximity,
      weightPopular: row.weightPopular,
      jobIntervalMinutes: row.jobIntervalMinutes,
      lastRunAt: row.lastRunAt,
      updatedAt: row.updatedAt,
    };
  }
}
