export interface CreateSubscriptionRequest {
  eventId: string;
  subscriptionType: 'NOTIFY_TICKET_AVAILABLE';
  email?: string;
}

export interface CreateSubscriptionResponse {
  subscribed: true;
}

export interface GetSubscriptionCountResponse {
  count: number;
}
