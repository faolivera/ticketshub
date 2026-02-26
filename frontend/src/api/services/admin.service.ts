import apiClient from '../client';
import type {
  AdminPaymentsResponse,
  AdminPendingEventsResponse,
  AdminUpdateEventRequest,
  AdminUpdateEventResponse,
  AdminApproveSectionRequest,
  AdminApproveSectionResponse,
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

  /**
   * Approve or reject an event section
   */
  async approveSection(
    sectionId: string,
    data: AdminApproveSectionRequest
  ): Promise<AdminApproveSectionResponse> {
    const response = await apiClient.patch<AdminApproveSectionResponse>(
      `/admin/events/sections/${sectionId}`,
      data
    );
    return response.data;
  },
};

export default adminService;
