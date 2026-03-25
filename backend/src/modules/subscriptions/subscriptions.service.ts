import {
  Injectable,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { ISubscriptionsRepository } from './subscriptions.repository.interface';
import { SUBSCRIPTIONS_REPOSITORY } from './subscriptions.repository.interface';
import { VALID_SUBSCRIPTION_TYPES } from './subscriptions.domain';
import { EventsService } from '../events/events.service';
import type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  GetSubscriptionCountResponse,
} from './subscriptions.api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class SubscriptionsService {
  private readonly logger = new ContextLogger(SubscriptionsService.name);

  constructor(
    @Inject(SUBSCRIPTIONS_REPOSITORY)
    private readonly repository: ISubscriptionsRepository,
    @Inject(EventsService)
    private readonly eventsService: EventsService,
  ) {}

  async subscribe(
    ctx: Ctx,
    userId: string | null,
    userEmail: string | null,
    body: CreateSubscriptionRequest,
  ): Promise<CreateSubscriptionResponse> {
    this.logger.debug(ctx, 'subscribe', { eventId: body.eventId, userId });

    if (!VALID_SUBSCRIPTION_TYPES.includes(body.subscriptionType)) {
      throw new BadRequestException(
        `Unknown subscriptionType: ${body.subscriptionType}`,
      );
    }

    // Validate event exists (throws NotFoundException if not)
    await this.eventsService.getEventById(ctx, body.eventId);

    let email: string;
    if (userId !== null && userEmail !== null) {
      email = userEmail;
    } else {
      if (!body.email || !EMAIL_REGEX.test(body.email)) {
        throw new BadRequestException('A valid email is required for guests');
      }
      email = body.email;
    }

    try {
      await this.repository.create(ctx, {
        eventId: body.eventId,
        subscriptionType: body.subscriptionType,
        userId,
        email,
      });
    } catch (err: unknown) {
      // Unique constraint violation — subscription already exists, treat as success
      if (
        typeof err === 'object' &&
        err !== null &&
        (err as { code?: string }).code === 'P2002'
      ) {
        this.logger.debug(ctx, 'subscribe:duplicate', { eventId: body.eventId, email });
      } else {
        this.logger.error(ctx, 'subscribe:error', err);
        throw err;
      }
    }

    return { subscribed: true };
  }

  async getCount(
    ctx: Ctx,
    eventId: string,
    subscriptionType: string,
  ): Promise<GetSubscriptionCountResponse> {
    this.logger.debug(ctx, 'getCount', { eventId, subscriptionType });

    if (!eventId) {
      throw new BadRequestException('eventId is required');
    }
    if (!subscriptionType) {
      throw new BadRequestException('subscriptionType is required');
    }

    const count = await this.repository.count(ctx, eventId, subscriptionType);
    return { count };
  }
}
