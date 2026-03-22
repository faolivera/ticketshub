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
  AdminTransactionAuditLogsResponse,
  AdminTransactionDetailResponse,
  AdminUpdateTransactionRequest,
  AdminTransactionsPendingSummaryResponse,
  AdminPaymentMethodsResponse,
  AdminPaymentMethodResponse,
  AdminCreatePaymentMethodRequest,
  AdminUpdatePaymentMethodRequest,
  PlatformConfig,
  UpdatePlatformConfigRequest,
  AdminPromotionListItem,
  AdminCreatePromotionRequest,
  AdminPromotionCodeListItem,
  AdminCreatePromotionCodeRequest,
  AdminUpdatePromotionCodeRequest,
  AdminUserSearchItem,
  AdminSellerPayoutsResponse,
  AdminCompletePayoutResponse,
  AdminSupportTicketsQuery,
  AdminSupportTicketsResponse,
  AdminSupportTicketItem,
  AdminSupportTicketDetailResponse,
  AdminUpdateSupportTicketStatusRequest,
  AdminResolveSupportDisputeRequest,
  AdminAddSupportTicketMessageRequest,
  AdminAddSupportTicketMessageResponse,
  AdminDashboardMetricsResponse,
  AdminUsersQuery,
  AdminUsersResponse,
  AdminUserDetailResponse,
  AdminUpdateUserRequest,
  ImportEventsPayload,
  ImportEventsPreviewResponse,
  ImportEventsValidationErrorResponse,
  ImportEventsResultResponse,
  AdminGetEventsRankingConfigResponse,
  AdminPatchEventsRankingConfigRequest,
  AdminPostEventsRankingQueueResponse,
  AdminSetFeaturedEventRequest,
  AdminSetFeaturedEventResponse,
} from '../types/admin';

/**
 * Admin service
 * Handles admin-specific endpoints
 */
export const adminService = {
  /**
   * Get dashboard metrics (users, events, support tickets, pending counts).
   */
  async getDashboardMetrics(): Promise<AdminDashboardMetricsResponse> {
    const response = await apiClient.get<AdminDashboardMetricsResponse>(
      '/admin/dashboard-metrics'
    );
    return response.data;
  },

  /**
   * Get paginated user list with optional search by name or email.
   */
  async getUsers(query: AdminUsersQuery = {}): Promise<AdminUsersResponse> {
    const params = new URLSearchParams();
    if (query.page !== undefined) params.append('page', String(query.page));
    if (query.limit !== undefined) params.append('limit', String(query.limit));
    if (query.search) params.append('search', query.search);
    const queryString = params.toString();
    const url = `/admin/users${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<AdminUsersResponse>(url);
    return response.data;
  },

  /**
   * Get user detail for admin view/edit.
   */
  async getUserById(userId: string): Promise<AdminUserDetailResponse> {
    const response = await apiClient.get<AdminUserDetailResponse>(
      `/admin/users/${userId}`
    );
    return response.data;
  },

  /**
   * Update user (admin only). Allowed fields: firstName, lastName, publicName, email, role, status, phone, emailVerified, phoneVerified.
   */
  async updateUser(
    userId: string,
    data: AdminUpdateUserRequest
  ): Promise<AdminUserDetailResponse> {
    const response = await apiClient.patch<AdminUserDetailResponse>(
      `/admin/users/${userId}`,
      data
    );
    return response.data;
  },

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
   * Toggle the featured/highlighted status of an event.
   * Invalidates the GET /api/events/highlights cache on the server.
   */
  async setFeaturedEvent(
    eventId: string,
    data: AdminSetFeaturedEventRequest
  ): Promise<AdminSetFeaturedEventResponse> {
    const response = await apiClient.patch<AdminSetFeaturedEventResponse>(
      `/admin/featured-events/${eventId}`,
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
   * Preview import events: validate payload and return preview with generated slugs (no persistence).
   * Returns validation errors in data when payload is invalid (still 200).
   */
  async getImportPreview(
    payload: ImportEventsPayload
  ): Promise<
    ImportEventsPreviewResponse | ImportEventsValidationErrorResponse
  > {
    const response = await apiClient.post<
      ImportEventsPreviewResponse | ImportEventsValidationErrorResponse
    >('/admin/events/import/preview', payload);
    return response.data;
  },

  /**
   * Execute import: create events, dates, and sections (all approved).
   * Validates payload first; throws on validation failure with errors in response.
   */
  async executeImport(
    payload: ImportEventsPayload
  ): Promise<ImportEventsResultResponse> {
    const response = await apiClient.post<ImportEventsResultResponse>(
      '/admin/events/import',
      payload
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
    if (query.highlighted) params.append('highlighted', 'true');

    const queryString = params.toString();
    const url = `/admin/events/all${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<AdminAllEventsResponse>(url);
    return response.data;
  },

  /**
   * Get all ticket listings for a specific event
   */
  /**
   * Get full event by ID (all fields, admin only).
   * Public GET /api/events/:id returns a reduced, non-sensitive shape.
   */
  async getEvent(eventId: string): Promise<import('../types/events').EventWithDates> {
    const response = await apiClient.get<import('../types/events').EventWithDates>(
      `/admin/events/${eventId}`
    );
    return response.data;
  },

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
   * Get audit logs for a transaction (admin).
   */
  async getTransactionAuditLogs(
    transactionId: string,
    order: 'asc' | 'desc' = 'desc',
  ): Promise<AdminTransactionAuditLogsResponse> {
    const response = await apiClient.get<AdminTransactionAuditLogsResponse>(
      `/admin/transactions/${transactionId}/audit-logs`,
      { params: { order } },
    );
    return response.data;
  },

  /**
   * Update transaction by ID (admin). All body fields optional.
   */
  async updateTransaction(
    transactionId: string,
    body: AdminUpdateTransactionRequest
  ): Promise<AdminTransactionDetailResponse> {
    const response = await apiClient.patch<AdminTransactionDetailResponse>(
      `/admin/transactions/${transactionId}`,
      body
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

  /**
   * List transactions in TransferringFund status for seller payouts page
   */
  async getSellerPayouts(): Promise<AdminSellerPayoutsResponse> {
    const response = await apiClient.get<AdminSellerPayoutsResponse>(
      '/admin/seller-payouts'
    );
    return response.data;
  },

  /**
   * Fetch the seller's transfer proof file as a blob URL for admin preview.
   * The caller is responsible for revoking the URL when no longer needed.
   */
  async getTransferProofBlobUrl(transactionId: string): Promise<string> {
    const response = await apiClient.get<Blob>(
      `/admin/transactions/${transactionId}/transfer-proof/file`,
      { responseType: 'blob' },
    );
    return URL.createObjectURL(response.data);
  },

  /**
   * Fetch the buyer's receipt proof file as a blob URL for admin preview.
   * The caller is responsible for revoking the URL when no longer needed.
   */
  async getReceiptProofBlobUrl(transactionId: string): Promise<string> {
    const response = await apiClient.get<Blob>(
      `/admin/transactions/${transactionId}/receipt-proof/file`,
      { responseType: 'blob' },
    );
    return URL.createObjectURL(response.data);
  },

  /**
   * Fetch a payout receipt file as a blob URL for admin preview.
   * The caller is responsible for revoking the URL when no longer needed.
   */
  async getPayoutReceiptFileBlobUrl(
    transactionId: string,
    fileId: string,
  ): Promise<string> {
    const response = await apiClient.get<Blob>(
      `/admin/transactions/${transactionId}/payout-receipts/${fileId}/file`,
      { responseType: 'blob' },
    );
    return URL.createObjectURL(response.data);
  },

  /**
   * Mark transaction payout as completed (release funds, set Completed, notify seller).
   * Optionally attach payment receipt files (images or PDF); upload is optional.
   */
  async completePayout(
    transactionId: string,
    receiptFiles?: File[],
  ): Promise<AdminCompletePayoutResponse> {
    if (receiptFiles?.length) {
      const formData = new FormData();
      receiptFiles.forEach((file) => formData.append('receipts', file));
      const response = await apiClient.post<AdminCompletePayoutResponse>(
        `/admin/transactions/${transactionId}/complete-payout`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      return response.data;
    }
    const response = await apiClient.post<AdminCompletePayoutResponse>(
      `/admin/transactions/${transactionId}/complete-payout`,
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

  // === Event Banner Management ===

  /**
   * Upload a banner for an event (admin)
   */
  async uploadEventBanner(
    eventId: string,
    bannerType: 'square' | 'rectangle' | 'og_image',
    file: File
  ): Promise<{ eventId: string; bannerType: string; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{
      success: true;
      data: { eventId: string; bannerType: string; url: string };
    }>(`/admin/events/${eventId}/banners/${bannerType}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Delete a banner for an event (admin)
   */
  async deleteEventBanner(
    eventId: string,
    bannerType: 'square' | 'rectangle' | 'og_image'
  ): Promise<{ success: true }> {
    const response = await apiClient.delete<{ success: true }>(
      `/admin/events/${eventId}/banners/${bannerType}`
    );
    return response.data;
  },

  // === Platform Config (admin only) ===

  /**
   * Get current platform config (fees and timeouts)
   */
  async getPlatformConfig(): Promise<PlatformConfig> {
    const response = await apiClient.get<PlatformConfig>(
      '/admin/config/platform'
    );
    return response.data;
  },

  /**
   * Update platform config
   */
  async updatePlatformConfig(
    data: UpdatePlatformConfigRequest
  ): Promise<PlatformConfig> {
    const response = await apiClient.patch<PlatformConfig>(
      '/admin/config/platform',
      data
    );
    return response.data;
  },

  // === Events ranking config (admin only) ===

  /**
   * Get event ranking config (weights and job cadence).
   */
  async getEventsRankingConfig(): Promise<AdminGetEventsRankingConfigResponse> {
    const response = await apiClient.get<AdminGetEventsRankingConfigResponse>(
      '/admin/events-ranking/config'
    );
    return response.data;
  },

  /**
   * Update event ranking config.
   */
  async patchEventsRankingConfig(
    data: AdminPatchEventsRankingConfigRequest
  ): Promise<AdminGetEventsRankingConfigResponse> {
    const response = await apiClient.patch<AdminGetEventsRankingConfigResponse>(
      '/admin/events-ranking/config',
      data
    );
    return response.data;
  },

  /**
   * Enqueue one or more events for re-scoring. Returns the number enqueued.
   */
  async postEventsRankingQueue(
    eventIds: string[]
  ): Promise<AdminPostEventsRankingQueueResponse> {
    const response = await apiClient.post<AdminPostEventsRankingQueueResponse>(
      '/admin/events-ranking/queue',
      { eventIds }
    );
    return response.data;
  },

  // === Promotions (admin only) ===

  /**
   * Search users by email for autocomplete (e.g. when adding promotion recipients).
   * Requires at least 2 characters. Returns id and email only.
   */
  async searchUsersByEmail(q: string): Promise<AdminUserSearchItem[]> {
    const term = (q ?? '').trim();
    if (term.length < 2) return [];
    const response = await apiClient.get<AdminUserSearchItem[]>(
      '/admin/users/search',
      { params: { q: term } }
    );
    return response.data;
  },

  /**
   * List promotions (optional filters: status, type, userId)
   */
  async getPromotions(params?: {
    status?: string;
    type?: string;
    userId?: string;
  }): Promise<AdminPromotionListItem[]> {
    const response = await apiClient.get<AdminPromotionListItem[]>(
      '/admin/promotions',
      { params }
    );
    return response.data;
  },

  /**
   * Create one or more promotions (one per user, by userIds or emails)
   */
  async createPromotion(
    data: AdminCreatePromotionRequest
  ): Promise<AdminPromotionListItem[]> {
    const response = await apiClient.post<AdminPromotionListItem[]>(
      '/admin/promotions',
      data
    );
    return response.data;
  },

  /**
   * Update promotion status (active | inactive)
   */
  async updatePromotionStatus(
    id: string,
    status: 'active' | 'inactive'
  ): Promise<{ status: string }> {
    const response = await apiClient.patch<{ status: string }>(
      `/admin/promotions/${id}/status`,
      { status }
    );
    return response.data;
  },

  /**
   * List promotion codes
   */
  async getPromotionCodes(): Promise<AdminPromotionCodeListItem[]> {
    const response = await apiClient.get<AdminPromotionCodeListItem[]>(
      '/admin/promotions/promotion-codes'
    );
    return response.data;
  },

  /**
   * Create a promotion code
   */
  async createPromotionCode(
    data: AdminCreatePromotionCodeRequest
  ): Promise<{ id: string; code: string }> {
    const response = await apiClient.post<{ id: string; code: string }>(
      '/admin/promotions/promotion-codes',
      data
    );
    return response.data;
  },

  /**
   * Update a promotion code
   */
  async updatePromotionCode(
    id: string,
    data: AdminUpdatePromotionCodeRequest
  ): Promise<AdminPromotionCodeListItem> {
    const response = await apiClient.patch<AdminPromotionCodeListItem>(
      `/admin/promotions/promotion-codes/${id}`,
      data
    );
    return response.data;
  },

  // === Support Tickets (admin) ===

  /**
   * List support tickets with pagination and filters
   */
  async getSupportTickets(
    query: AdminSupportTicketsQuery = {}
  ): Promise<AdminSupportTicketsResponse> {
    const params = new URLSearchParams();
    if (query.page !== undefined) params.append('page', String(query.page));
    if (query.limit !== undefined) params.append('limit', String(query.limit));
    if (query.status) params.append('status', query.status);
    if (query.category) params.append('category', query.category);
    if (query.source) params.append('source', query.source);
    const queryString = params.toString();
    const url = `/admin/support-tickets${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<AdminSupportTicketsResponse>(url);
    return response.data;
  },

  /**
   * Get support ticket detail with messages
   */
  async getSupportTicketById(
    ticketId: string
  ): Promise<AdminSupportTicketDetailResponse> {
    const response = await apiClient.get<AdminSupportTicketDetailResponse>(
      `/admin/support-tickets/${ticketId}`
    );
    return response.data;
  },

  /**
   * Update support ticket status
   */
  async updateSupportTicketStatus(
    ticketId: string,
    data: AdminUpdateSupportTicketStatusRequest
  ): Promise<AdminSupportTicketItem> {
    const response = await apiClient.patch<AdminSupportTicketItem>(
      `/admin/support-tickets/${ticketId}/status`,
      data
    );
    return response.data;
  },

  /**
   * Resolve a dispute ticket
   */
  async resolveSupportDispute(
    ticketId: string,
    data: AdminResolveSupportDisputeRequest
  ): Promise<AdminSupportTicketItem> {
    const response = await apiClient.patch<AdminSupportTicketItem>(
      `/admin/support-tickets/${ticketId}/resolve`,
      data
    );
    return response.data;
  },

  /**
   * Add admin reply to a support ticket
   */
  async addSupportTicketMessage(
    ticketId: string,
    data: AdminAddSupportTicketMessageRequest
  ): Promise<AdminAddSupportTicketMessageResponse> {
    const response = await apiClient.post<AdminAddSupportTicketMessageResponse>(
      `/admin/support-tickets/${ticketId}/messages`,
      data
    );
    return response.data;
  },
};

export default adminService;
