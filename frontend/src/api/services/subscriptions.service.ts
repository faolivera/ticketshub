import apiClient from '../client';

export const subscriptionsService = {
  async subscribe(
    eventId: string,
    email?: string,
  ): Promise<{ subscribed: true }> {
    const response = await apiClient.post<{ subscribed: true }>(
      '/subscriptions',
      {
        eventId,
        subscriptionType: 'NOTIFY_TICKET_AVAILABLE',
        ...(email !== undefined ? { email } : {}),
      },
    );
    return response.data;
  },

  async getCount(
    eventId: string,
    subscriptionType: string,
  ): Promise<{ count: number }> {
    const response = await apiClient.get<{ count: number }>(
      '/subscriptions/count',
      { params: { eventId, subscriptionType } },
    );
    return response.data;
  },
};
