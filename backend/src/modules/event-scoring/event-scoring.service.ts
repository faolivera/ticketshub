import { Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import { EventScoringRepository, type EventsRankingConfigRow } from './event-scoring.repository';
import type {
  GetEventsRankingConfigResponse,
  PatchEventsRankingConfigRequest,
} from './event-scoring.api';
import { EventsService } from '../events/events.service';
import { TransactionsService } from '../transactions/transactions.service';

/** Components merged from events + transactions for score computation. */
interface EventScoreComponents {
  hasActiveListings: boolean;
  activeListingsCount: number;
  completedTransactionsCount: number;
  nextEventDate: Date | null;
  isPopular: boolean;
  city: string;
}

/** Default multiplier when city has no configured weight. */
const DEFAULT_CITY_WEIGHT = 1;

@Injectable()
export class EventScoringService {

  private readonly logger = new ContextLogger(EventScoringService.name);

  constructor(
    private readonly eventScoringRepository: EventScoringRepository,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Request that an event's ranking be recomputed. Enqueues the event; the job will process it asynchronously.
   * Swallows errors so callers are never failed by scoring.
   */
  async requestScoring(ctx: Ctx, eventId: string): Promise<void> {
    try {
      await this.eventScoringRepository.enqueueEvent(ctx, eventId);
    } catch (error) {
      this.logger.error(ctx, 'requestScoring failed', { eventId, error });
    }
  }

  /**
   * Enqueue one or more events for re-scoring. Returns the number of events enqueued.
   * Swallows errors so callers are never failed by scoring.
   */
  async requestScoringBatch(ctx: Ctx, eventIds: string[]): Promise<{ enqueued: number }> {
    try {
      for (const eventId of eventIds) {
        await this.eventScoringRepository.enqueueEvent(ctx, eventId);
      }
      return { enqueued: eventIds.length };
    } catch (error) {
      this.logger.error(ctx, 'requestScoringBatch failed', { eventIds, error });
      return { enqueued: 0 };
    }
  }

  /**
   * Get current ranking config for admin.
   */
  async getConfig(ctx: Ctx): Promise<GetEventsRankingConfigResponse> {
    const row = await this.eventScoringRepository.getConfig(ctx);
    if (!row) {
      throw new NotFoundException('Events ranking config not found');
    }
    return {
      weightActiveListings: row.weightActiveListings,
      weightTransactions: row.weightTransactions,
      weightProximity: row.weightProximity,
      weightPopular: row.weightPopular,
      jobIntervalMinutes: row.jobIntervalMinutes,
      lastRunAt: row.lastRunAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /**
   * Update ranking config (weights and/or job cadence).
   */
  async updateConfig(
    ctx: Ctx,
    body: PatchEventsRankingConfigRequest,
  ): Promise<GetEventsRankingConfigResponse> {
    const updated = await this.eventScoringRepository.updateConfig(ctx, {
      weightActiveListings: body.weightActiveListings,
      weightTransactions: body.weightTransactions,
      weightProximity: body.weightProximity,
      weightPopular: body.weightPopular,
      jobIntervalMinutes: body.jobIntervalMinutes,
    });
    return {
      weightActiveListings: updated.weightActiveListings,
      weightTransactions: updated.weightTransactions,
      weightProximity: updated.weightProximity,
      weightPopular: updated.weightPopular,
      jobIntervalMinutes: updated.jobIntervalMinutes,
      lastRunAt: updated.lastRunAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Run the scoring job: process queue, recompute scores, update config lastRunAt.
   * Uses EventsService and TransactionsService in batch to avoid N+1.
   */
  async runScoringJob(ctx: Ctx): Promise<{ processed: number }> {
    this.logger.log(ctx, 'runScoringJob: starting');
    const config = await this.eventScoringRepository.getConfig(ctx);
    if (!config) {
      this.logger.warn(ctx, 'runScoringJob: no config found, skipping');
      return { processed: 0 };
    }
    const eventIds = await this.eventScoringRepository.getPendingEventIds(ctx);
    if (eventIds.length === 0) {
      await this.eventScoringRepository.updateConfig(ctx, { lastRunAt: new Date() });
      return { processed: 0 };
    }

    const [eventComponentsMap, txCountByEventId] = await Promise.all([
      this.eventsService.getEventRankingComponentsBatch(ctx, eventIds),
      this.transactionsService.getCompletedTransactionCountByEventIds(ctx, eventIds),
    ]);

    const now = new Date();
    const updates: Array<{ eventId: string; rankingScore: number; rankingUpdatedAt: Date }> = [];

    for (const eventId of eventIds) {
      try {
        const eventData = eventComponentsMap.get(eventId);
        if (!eventData) {
          this.logger.debug(ctx, 'runScoringJob: event not found, skipping', { eventId });
          continue;
        }
        const completedTransactionsCount = txCountByEventId.get(eventId) ?? 0;
        const components: EventScoreComponents = {
          hasActiveListings: eventData.hasActiveListings,
          activeListingsCount: eventData.activeListingsCount,
          nextEventDate: eventData.nextEventDate,
          isPopular: eventData.isPopular,
          completedTransactionsCount,
          city: eventData.city,
        };
        const score = this.computeScore(components, config);
        updates.push({ eventId, rankingScore: score, rankingUpdatedAt: now });
      } catch (error) {
        this.logger.error(ctx, 'runScoringJob: failed to score event', { eventId, error });
      }
    }

    if (updates.length > 0) {
      await this.eventsService.updateEventRankingBatch(ctx, updates);
      const processedIds = updates.map((u) => u.eventId);
      await this.eventScoringRepository.removeFromQueue(ctx, processedIds);
      await this.eventScoringRepository.updateConfig(ctx, { lastRunAt: now });
      this.logger.log(ctx, `runScoringJob: processed ${updates.length} events`);
    }

    return { processed: updates.length };
  }

  /**
   * Compute ranking score from components and config weights.
   * - Active listings: config.weightActiveListings + components.activeListingsCount;
   * - Transactions: count (capped) * weightTransactions
   * - Proximity: 1 / (daysUntilNext + 1) * weightProximity, or 0 if no future date
   * - Popular: 0 or 1 (admin-set) * weightPopular
   * - City: multiplier from eventScoring.cityWeights (HOCON), case-insensitive; default 1.
   */
  private computeScore(components: EventScoreComponents, config: EventsRankingConfigRow): number {
    let score = 0;

    if (components.hasActiveListings) {
      score += config.weightActiveListings + components.activeListingsCount;
    }

    if (components.isPopular) {
      score += config.weightPopular;
    }

    const txCap = 100;
    const txCount = Math.min(components.completedTransactionsCount, txCap);
    score += config.weightTransactions * txCount;

    if (components.nextEventDate) {
      const now = new Date();
      const daysUntil = Math.max(
        0,
        (components.nextEventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const proximityFactor = 1 / (daysUntil + 1);
      score += config.weightProximity * proximityFactor;
    }

    const cityWeight = this.getCityWeight(components.city);
    return score * cityWeight;
  }

  /**
   * Resolve city weight from HOCON eventScoring.cityWeights (case-insensitive). Returns 1 if not configured.
   */
  private getCityWeight(city: string): number {
    if (!city || !city.trim()) return DEFAULT_CITY_WEIGHT;
    const cityWeights =
      this.configService.get<Record<string, number>>('eventScoring.cityWeights') ?? {};
    const key = Object.keys(cityWeights).find(
      (k) => k.trim().toLowerCase() === city.trim().toLowerCase(),
    );
    return key != null ? cityWeights[key] : DEFAULT_CITY_WEIGHT;
  }
}
