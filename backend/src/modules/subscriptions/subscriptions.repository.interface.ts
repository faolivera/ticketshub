import type { Ctx } from '../../common/types/context';
import type { EventSubscription } from './subscriptions.domain';

export interface ISubscriptionsRepository {
  create(
    ctx: Ctx,
    data: {
      eventId: string;
      subscriptionType: string;
      userId: string | null;
      email: string;
    },
  ): Promise<EventSubscription>;

  count(ctx: Ctx, eventId: string, subscriptionType: string): Promise<number>;
}

export const SUBSCRIPTIONS_REPOSITORY = Symbol('ISubscriptionsRepository');
