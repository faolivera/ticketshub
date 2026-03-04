/**
 * API request/response types for the notifications module
 */

import type {
  Notification,
  NotificationEvent,
  NotificationTemplate,
  NotificationChannelConfig,
  NotificationEventStatus,
  NotificationPriority,
} from './notifications.domain';
import { NotificationEventType } from './notifications.domain';

// ============================================================================
// USER ENDPOINTS
// ============================================================================

/**
 * GET /notifications
 */
export interface GetNotificationsRequest {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface NotificationListItem {
  id: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
}

export interface GetNotificationsResponse {
  notifications: NotificationListItem[];
  total: number;
  unreadCount: number;
}

/**
 * GET /notifications/unread-count
 */
export interface GetUnreadCountResponse {
  count: number;
}

/**
 * PATCH /notifications/:id/read
 */
export type MarkAsReadResponse = NotificationListItem;

/**
 * PATCH /notifications/read-all
 */
export interface MarkAllAsReadResponse {
  markedCount: number;
}

/**
 * PATCH /notifications/read-batch
 */
export interface MarkAsReadBatchRequest {
  notificationIds: string[];
}

export interface MarkAsReadBatchResponse {
  markedCount: number;
}

// ============================================================================
// ADMIN ENDPOINTS - TEMPLATES
// ============================================================================

/**
 * GET /admin/notifications/templates
 */
export interface GetTemplatesResponse {
  templates: NotificationTemplate[];
}

/**
 * GET /admin/notifications/templates/:id
 */
export type GetTemplateResponse = NotificationTemplate;

/**
 * PUT /admin/notifications/templates/:id
 */
export interface UpdateTemplateRequest {
  titleTemplate: string;
  bodyTemplate: string;
  actionUrlTemplate?: string;
  isActive: boolean;
}

export type UpdateTemplateResponse = NotificationTemplate;

/**
 * POST /admin/notifications/templates
 */
export interface CreateTemplateRequest {
  eventType: NotificationEventType;
  channel: string;
  locale: string;
  titleTemplate: string;
  bodyTemplate: string;
  actionUrlTemplate?: string;
}

export type CreateTemplateResponse = NotificationTemplate;

// ============================================================================
// ADMIN ENDPOINTS - CHANNEL CONFIG
// ============================================================================

/**
 * GET /admin/notifications/channel-config
 */
export interface GetChannelConfigsResponse {
  configs: NotificationChannelConfig[];
}

/**
 * GET /admin/notifications/channel-config/:eventType
 */
export type GetChannelConfigResponse = NotificationChannelConfig;

/**
 * PUT /admin/notifications/channel-config/:eventType
 */
export interface UpdateChannelConfigRequest {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  priority: NotificationPriority;
}

export type UpdateChannelConfigResponse = NotificationChannelConfig;

// ============================================================================
// ADMIN ENDPOINTS - EVENTS (AUDIT)
// ============================================================================

/**
 * GET /admin/notifications/events
 */
export interface GetEventsRequest {
  page?: number;
  limit?: number;
  type?: NotificationEventType;
  status?: NotificationEventStatus;
  from?: string;
  to?: string;
}

export interface GetEventsResponse {
  events: NotificationEvent[];
  total: number;
}

/**
 * GET /admin/notifications/events/:id
 */
export type GetEventResponse = NotificationEvent;

/**
 * GET /admin/notifications/events/:id/notifications
 */
export interface GetEventNotificationsResponse {
  notifications: Notification[];
}

// ============================================================================
// TEMPLATE VARIABLES DOCUMENTATION
// ============================================================================

/**
 * Available template variables for each event type.
 * Used by the admin UI to show available placeholders.
 */
export const TEMPLATE_VARIABLES: Record<NotificationEventType, string[]> = {
  [NotificationEventType.PAYMENT_REQUIRED]: [
    'sellerName',
    'eventName',
    'amount',
    'currency',
    'amountFormatted',
    'expiresAt',
    'transactionId',
  ],
  [NotificationEventType.BUYER_PAYMENT_SUBMITTED]: [
    'buyerName',
    'eventName',
    'amount',
    'currency',
    'amountFormatted',
    'transactionId',
  ],
  [NotificationEventType.BUYER_PAYMENT_APPROVED]: [
    'title',
    'body',
    'transactionId',
  ],
  [NotificationEventType.BUYER_PAYMENT_REJECTED]: [
    'sellerName',
    'eventName',
    'rejectionReason',
    'transactionId',
  ],
  [NotificationEventType.SELLER_PAYMENT_RECEIVED]: [
    'eventName',
    'amount',
    'currency',
    'amountFormatted',
    'transactionId',
  ],
  [NotificationEventType.TICKET_TRANSFERRED]: [
    'eventName',
    'eventDate',
    'venue',
    'transactionId',
  ],
  [NotificationEventType.TRANSACTION_COMPLETED]: [
    'eventName',
    'amount',
    'currency',
    'amountFormatted',
    'transactionId',
  ],
  [NotificationEventType.TRANSACTION_CANCELLED]: [
    'eventName',
    'cancelledBy',
    'reason',
    'transactionId',
  ],
  [NotificationEventType.TRANSACTION_EXPIRED]: ['eventName', 'transactionId'],
  [NotificationEventType.DISPUTE_OPENED]: [
    'eventName',
    'openedBy',
    'reason',
    'disputeId',
    'transactionId',
  ],
  [NotificationEventType.DISPUTE_RESOLVED]: [
    'eventName',
    'resolution',
    'resolvedInFavorOf',
    'disputeId',
    'transactionId',
  ],
  [NotificationEventType.IDENTITY_VERIFIED]: ['userName'],
  [NotificationEventType.IDENTITY_REJECTED]: ['userName', 'rejectionReason'],
  [NotificationEventType.EVENT_APPROVED]: ['eventName'],
  [NotificationEventType.EVENT_REJECTED]: ['eventName', 'rejectionReason'],
  [NotificationEventType.REVIEW_RECEIVED]: [
    'reviewerName',
    'rating',
    'comment',
    'transactionId',
  ],
  [NotificationEventType.OFFER_RECEIVED]: [
    'offerId',
    'listingId',
    'eventName',
    'offeredAmount',
    'currency',
    'amountFormatted',
  ],
  [NotificationEventType.OFFER_ACCEPTED]: [
    'offerId',
    'listingId',
    'eventName',
    'offeredAmount',
    'currency',
    'amountFormatted',
  ],
  [NotificationEventType.OFFER_REJECTED]: ['offerId', 'listingId', 'eventName'],
  [NotificationEventType.OFFER_CANCELLED]: [
    'offerId',
    'listingId',
    'eventName',
    'reason',
  ],
};
