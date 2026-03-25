export const SUBSCRIPTION_TYPES = {
  NOTIFY_TICKET_AVAILABLE: 'NOTIFY_TICKET_AVAILABLE',
} as const;

export type SubscriptionType =
  (typeof SUBSCRIPTION_TYPES)[keyof typeof SUBSCRIPTION_TYPES];

export const VALID_SUBSCRIPTION_TYPES: string[] =
  Object.values(SUBSCRIPTION_TYPES);

export interface EventSubscription {
  id: string;
  eventId: string;
  subscriptionType: SubscriptionType;
  userId: string | null;
  email: string;
  createdAt: Date;
}
