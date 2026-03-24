/**
 * Notification system domain models and types
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Types of events that can trigger notifications
 */
export enum NotificationEventType {
  // Transaction lifecycle
  BUYER_PAYMENT_SUBMITTED = 'BUYER_PAYMENT_SUBMITTED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  BUYER_PAYMENT_REJECTED = 'BUYER_PAYMENT_REJECTED',
  TICKET_SENT = 'TICKET_SENT',
  TICKET_RECEIVED = 'TICKET_RECEIVED',
  TRANSACTION_COMPLETED = 'TRANSACTION_COMPLETED',
  TRANSACTION_CANCELLED = 'TRANSACTION_CANCELLED',

  // Disputes
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',

  // Identity verification
  IDENTITY_VERIFIED = 'IDENTITY_VERIFIED',
  IDENTITY_REJECTED = 'IDENTITY_REJECTED',
  IDENTITY_SUBMITTED = 'IDENTITY_SUBMITTED',
  BANK_ACCOUNT_SUBMITTED = 'BANK_ACCOUNT_SUBMITTED',
  SELLER_VERIFICATION_COMPLETE = 'SELLER_VERIFICATION_COMPLETE',

  // Events (concerts, etc.)
  EVENT_APPROVED = 'EVENT_APPROVED',
  EVENT_REJECTED = 'EVENT_REJECTED',

  // Reviews
  REVIEW_RECEIVED = 'REVIEW_RECEIVED',

  // Offers
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  OFFER_ACCEPTED = 'OFFER_ACCEPTED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  OFFER_CANCELLED = 'OFFER_CANCELLED',
  OFFER_EXPIRED = 'OFFER_EXPIRED',
}

/**
 * Channels through which notifications can be sent
 */
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
}

/**
 * Status of a notification event in the processing pipeline
 */
export enum NotificationEventStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Status of an individual notification
 */
export enum NotificationStatus {
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

/**
 * Priority levels for notification processing
 */
export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Role of the notification recipient
 */
export enum NotificationRecipientRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  ADMIN = 'ADMIN',
}

// ============================================================================
// ENTITIES
// ============================================================================

/**
 * A notification event represents something that happened in the system
 * that should trigger notifications to one or more users.
 */
export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  context: Record<string, unknown>;
  triggeredBy?: string;
  triggeredAt: Date;
  status: NotificationEventStatus;
  processedAt?: Date;
  error?: string;
}

/**
 * An individual notification sent to a user through a specific channel.
 */
export interface Notification {
  id: string;
  eventId: string;
  eventType: NotificationEventType;
  recipientId: string;
  channel: NotificationChannel;
  recipientRole: NotificationRecipientRole;

  // Content (rendered from template)
  title: string;
  body: string;
  actionUrl?: string;

  // Status
  status: NotificationStatus;

  // In-app specific
  read: boolean;
  readAt?: Date;

  // Delivery tracking
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  // Retry logic (for EMAIL channel)
  retryCount: number;
  nextRetryAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * A template used to render notification content.
 * Templates use {{variable}} syntax for placeholder substitution.
 */
export interface NotificationTemplate {
  id: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  locale: string;
  recipientRole: NotificationRecipientRole;

  // Templates with {{variable}} placeholders
  titleTemplate: string;
  bodyTemplate: string;
  actionUrlTemplate?: string;

  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * Configuration for which channels are enabled for each event type.
 * Editable from admin dashboard.
 */
export interface NotificationChannelConfig {
  id: string;
  eventType: NotificationEventType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  priority: NotificationPriority;
  updatedAt: Date;
  updatedBy?: string;
}

// ============================================================================
// PROCESSOR TYPES
// ============================================================================

/**
 * A recipient to be notified
 */
export interface NotificationRecipient {
  userId: string;
  role: NotificationRecipientRole;
}

/**
 * Content for a notification channel
 */
export interface ChannelContent {
  title: string;
  body: string;
  actionUrl?: string;
}

// ============================================================================
// ID GENERATION HELPERS
// ============================================================================

export function generateNotificationEventId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(16).substring(2, 10);
  return `ne_${timestamp}_${random}`;
}

export function generateNotificationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(16).substring(2, 10);
  return `n_${timestamp}_${random}`;
}

export function generateNotificationTemplateId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(16).substring(2, 10);
  return `nt_${timestamp}_${random}`;
}

export function generateNotificationChannelConfigId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(16).substring(2, 10);
  return `ncc_${timestamp}_${random}`;
}

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

export const NOTIFICATION_RETRY_CONFIG = {
  maxRetries: 3,
  backoffMinutes: [1, 5, 15], // Exponential backoff: 1min, 5min, 15min
};

export const NOTIFICATION_RETENTION_DAYS = 30;
