import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { ISubscriptionsRepository } from './subscriptions.repository.interface';
import type { EventSubscription } from './subscriptions.domain';

@Injectable()
export class SubscriptionsRepository implements ISubscriptionsRepository {
  private readonly logger = new ContextLogger(SubscriptionsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    ctx: Ctx,
    data: {
      eventId: string;
      subscriptionType: string;
      userId: string | null;
      email: string;
    },
  ): Promise<EventSubscription> {
    this.logger.debug(ctx, 'create', { eventId: data.eventId });
    const row = await this.prisma.eventSubscription.create({ data });
    return {
      id: row.id,
      eventId: row.eventId,
      subscriptionType: row.subscriptionType as EventSubscription['subscriptionType'],
      userId: row.userId,
      email: row.email,
      createdAt: row.createdAt,
    };
  }

  async count(
    ctx: Ctx,
    eventId: string,
    subscriptionType: string,
  ): Promise<number> {
    this.logger.debug(ctx, 'count', { eventId, subscriptionType });
    return this.prisma.eventSubscription.count({
      where: { eventId, subscriptionType },
    });
  }
}
