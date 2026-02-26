import apiClient from '../client';
import type {
  AdminPaymentsResponse,
  AdminPendingEventsResponse,
  AdminUpdateEventRequest,
  AdminUpdateEventResponse,
} from '../types/admin';

/**
 * Admin service
 * Handles admin-specific endpoints
 */
export const adminService = {
  /**
   * Get enriched payment confirmations for admin payments page
   */
  async getPayments(): Promise<AdminPaymentsResponse> {
    const response =
      await apiClient.get<AdminPaymentsResponse>('/admin/payments');
    return response.data;
  },

  /**
   * Get pending events and event dates for admin approval
   */
  async getPendingEvents(): Promise<AdminPendingEventsResponse> {
    const response =
      await apiClient.get<AdminPendingEventsResponse>('/admin/events/pending');
    return response.data;
  },

  /**
   * Update an event (admin only)
   */
  async updateEvent(
    eventId: string,
    data: AdminUpdateEventRequest
  ): Promise<AdminUpdateEventResponse> {
    const response = await apiClient.patch<AdminUpdateEventResponse>(
      `/admin/events/${eventId}`,
      data
    );
    return response.data;
  },
};

export default adminService;
