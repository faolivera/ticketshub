import apiClient from '../client';
import type {
  AdminPaymentsResponse,
  AdminPendingEventsResponse,
  AdminUpdateEventRequest,
  AdminUpdateEventResponse,
  AdminApproveSectionRequest,
  AdminApproveSectionResponse,
  AdminAddSectionRequest,
  AdminAddSectionResponse,
  AdminUpdateSectionRequest,
  AdminUpdateSectionResponse,
  AdminDeleteSectionResponse,
  AdminAllEventsQuery,
  AdminAllEventsResponse,
  AdminEventListingsResponse,
  AdminTransactionsQuery,
  AdminTransactionsResponse,
  AdminTransactionDetailResponse,
  AdminTransactionsPendingSummaryResponse,
  AdminPaymentMethodsResponse,
  AdminPaymentMethodResponse,
  AdminCreatePaymentMethodRequest,
  AdminUpdatePaymentMethodRequest,
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

  /**
   * Add a new section to an event (admin only, auto-approved)
   */
  async addSection(
    eventId: string,
    data: AdminAddSectionRequest
  ): Promise<AdminAddSectionResponse> {
    const response = await apiClient.post<AdminAddSectionResponse>(
      `/admin/events/${eventId}/sections`,
      data
    );
    return response.data;
  },

  /**
   * Update an event section (name and/or seating type)
   */
  async updateSection(
    sectionId: string,
    data: AdminUpdateSectionRequest
  ): Promise<AdminUpdateSectionResponse> {
    const response = await apiClient.put<AdminUpdateSectionResponse>(
      `/admin/events/sections/${sectionId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an event section (only allowed if no listings exist)
   */
  async deleteSection(sectionId: string): Promise<AdminDeleteSectionResponse> {
    const response = await apiClient.delete<AdminDeleteSectionResponse>(
      `/admin/events/sections/${sectionId}`
    );
    return response.data;
  },

  /**
   * Get all events with pagination and optional search filter
   */
  async getAllEvents(
    query: AdminAllEventsQuery = {}
  ): Promise<AdminAllEventsResponse> {
    const params = new URLSearchParams();
    if (query.page !== undefined) params.append('page', String(query.page));
    if (query.limit !== undefined) params.append('limit', String(query.limit));
    if (query.search) params.append('search', query.search);

    const queryString = params.toString();
    const url = `/admin/events/all${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<AdminAllEventsResponse>(url);
    return response.data;
  },

  /**
   * Get all ticket listings for a specific event
   */
  async getEventListings(eventId: string): Promise<AdminEventListingsResponse> {
    const response = await apiClient.get<AdminEventListingsResponse>(
      `/admin/events/${eventId}/listings`
    );
    return response.data;
  },

  /**
   * Get paginated transactions for admin
   */
  async getTransactions(
    query: AdminTransactionsQuery = {}
  ): Promise<AdminTransactionsResponse> {
    const params = new URLSearchParams();
    if (query.page !== undefined) params.append('page', String(query.page));
    if (query.limit !== undefined) params.append('limit', String(query.limit));
    if (query.search) params.append('search', query.search);

    const queryString = params.toString();
    const url = `/admin/transactions${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<AdminTransactionsResponse>(url);
    return response.data;
  },

  /**
   * Get single transaction detail for admin
   */
  async getTransactionById(
    transactionId: string
  ): Promise<AdminTransactionDetailResponse> {
    const response = await apiClient.get<AdminTransactionDetailResponse>(
      `/admin/transactions/${transactionId}`
    );
    return response.data;
  },

  /**
   * Get pending transactions/confirmations summary for admin
   */
  async getTransactionsPendingSummary(): Promise<AdminTransactionsPendingSummaryResponse> {
    const response = await apiClient.get<AdminTransactionsPendingSummaryResponse>(
      '/admin/transactions/pending-summary'
    );
    return response.data;
  },

  // === Payment Methods CRUD ===

  /**
   * Get all payment methods
   */
  async getPaymentMethods(): Promise<AdminPaymentMethodsResponse> {
    const response = await apiClient.get<AdminPaymentMethodsResponse>(
      '/admin/payment-methods'
    );
    return response.data;
  },

  /**
   * Get single payment method by ID
   */
  async getPaymentMethod(id: string): Promise<AdminPaymentMethodResponse> {
    const response = await apiClient.get<AdminPaymentMethodResponse>(
      `/admin/payment-methods/${id}`
    );
    return response.data;
  },

  /**
   * Create a new payment method
   */
  async createPaymentMethod(
    data: AdminCreatePaymentMethodRequest
  ): Promise<AdminPaymentMethodResponse> {
    const response = await apiClient.post<AdminPaymentMethodResponse>(
      '/admin/payment-methods',
      data
    );
    return response.data;
  },

  /**
   * Update an existing payment method
   */
  async updatePaymentMethod(
    id: string,
    data: AdminUpdatePaymentMethodRequest
  ): Promise<AdminPaymentMethodResponse> {
    const response = await apiClient.patch<AdminPaymentMethodResponse>(
      `/admin/payment-methods/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Toggle payment method status (enable/disable)
   */
  async togglePaymentMethodStatus(
    id: string,
    status: 'enabled' | 'disabled'
  ): Promise<AdminPaymentMethodResponse> {
    const response = await apiClient.patch<AdminPaymentMethodResponse>(
      `/admin/payment-methods/${id}/toggle`,
      { status }
    );
    return response.data;
  },

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(id: string): Promise<{ deleted: boolean }> {
    const response = await apiClient.delete<{ deleted: boolean }>(
      `/admin/payment-methods/${id}`
    );
    return response.data;
  },
};

export default adminService;
