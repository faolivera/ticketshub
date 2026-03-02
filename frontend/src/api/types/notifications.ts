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

export type NotificationChannel = 'IN_APP' | 'EMAIL';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface NotificationChannelConfig {
  id: string;
  eventType: NotificationEventType;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  priority: NotificationPriority;
  updatedAt: string;
  updatedBy?: string;
}

export interface NotificationTemplate {
  id: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  locale: string;
  titleTemplate: string;
  bodyTemplate: string;
  actionUrlTemplate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface NotificationChannelConfigsResponse {
  configs: NotificationChannelConfig[];
}

export interface NotificationTemplatesResponse {
  templates: NotificationTemplate[];
}

export interface UpdateChannelConfigRequest {
  inAppEnabled: boolean;
  emailEnabled: boolean;
  priority: NotificationPriority;
}

export interface UpdateTemplateRequest {
  titleTemplate: string;
  bodyTemplate: string;
  actionUrlTemplate?: string;
  isActive: boolean;
}

export const TEMPLATE_VARIABLES: Record<NotificationEventType, string[]> = {
  PAYMENT_REQUIRED: ['sellerName', 'eventName', 'amount', 'currency', 'amountFormatted', 'expiresAt', 'transactionId'],
  BUYER_PAYMENT_SUBMITTED: ['buyerName', 'eventName', 'amount', 'currency', 'amountFormatted', 'transactionId'],
  BUYER_PAYMENT_APPROVED: ['sellerName', 'eventName', 'transactionId'],
  BUYER_PAYMENT_REJECTED: ['sellerName', 'eventName', 'rejectionReason', 'transactionId'],
  TICKET_TRANSFERRED: ['eventName', 'eventDate', 'venue', 'transactionId'],
  TRANSACTION_COMPLETED: ['eventName', 'amount', 'currency', 'amountFormatted', 'transactionId'],
  TRANSACTION_CANCELLED: ['eventName', 'cancelledBy', 'reason', 'transactionId'],
  TRANSACTION_EXPIRED: ['eventName', 'transactionId'],
  DISPUTE_OPENED: ['eventName', 'openedBy', 'reason', 'disputeId', 'transactionId'],
  DISPUTE_RESOLVED: ['eventName', 'resolution', 'resolvedInFavorOf', 'disputeId', 'transactionId'],
  IDENTITY_VERIFIED: ['userName'],
  IDENTITY_REJECTED: ['userName', 'rejectionReason'],
  EVENT_APPROVED: ['eventName'],
  EVENT_REJECTED: ['eventName', 'rejectionReason'],
  REVIEW_RECEIVED: ['reviewerName', 'rating', 'comment', 'transactionId'],
};

export const ALL_EVENT_TYPES: NotificationEventType[] = [
  'PAYMENT_REQUIRED',
  'BUYER_PAYMENT_SUBMITTED',
  'BUYER_PAYMENT_APPROVED',
  'BUYER_PAYMENT_REJECTED',
  'TICKET_TRANSFERRED',
  'TRANSACTION_COMPLETED',
  'TRANSACTION_CANCELLED',
  'TRANSACTION_EXPIRED',
  'DISPUTE_OPENED',
  'DISPUTE_RESOLVED',
  'IDENTITY_VERIFIED',
  'IDENTITY_REJECTED',
  'EVENT_APPROVED',
  'EVENT_REJECTED',
  'REVIEW_RECEIVED',
];
