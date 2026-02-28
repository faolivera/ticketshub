import apiClient from '../client';

/**
 * Notification event types
 */
export type NotificationEventType =
  | 'PAYMENT_REQUIRED'
  | 'BUYER_PAYMENT_SUBMITTED'
  | 'BUYER_PAYMENT_APPROVED'
  | 'BUYER_PAYMENT_REJECTED'
  | 'TICKET_TRANSFERRED'
  | 'TRANSACTION_COMPLETED'
  | 'TRANSACTION_CANCELLED'
  | 'TRANSACTION_EXPIRED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  | 'IDENTITY_VERIFIED'
  | 'IDENTITY_REJECTED'
  | 'EVENT_APPROVED'
  | 'EVENT_REJECTED'
  | 'REVIEW_RECEIVED';

/**
 * Individual notification item
 */
export interface NotificationItem {
  id: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  actionUrl?: string;
  read: boolean;
  createdAt: string;
}

/**
 * Response for getting notifications
 */
export interface GetNotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  unreadCount: number;
}

/**
 * Response for unread count
 */
export interface UnreadCountResponse {
  count: number;
}

/**
 * Response for marking all as read
 */
export interface MarkAllAsReadResponse {
  markedCount: number;
}

/**
 * Notifications service for notification-related API operations
 */
export const notificationsService = {
  /**
   * Get paginated in-app notifications
   */
  async getNotifications(
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<GetNotificationsResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      unreadOnly: String(unreadOnly),
    });
    const response = await apiClient.get<GetNotificationsResponse>(
      `/notifications?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get unread notification count (for badge)
   */
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>(
      '/notifications/unread-count'
    );
    return response.data.count;
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<NotificationItem> {
    const response = await apiClient.patch<NotificationItem>(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<number> {
    const response = await apiClient.patch<MarkAllAsReadResponse>(
      '/notifications/read-all'
    );
    return response.data.markedCount;
  },
};

export default notificationsService;
