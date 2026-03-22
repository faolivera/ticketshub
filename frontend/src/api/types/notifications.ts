export type NotificationEventType =
  | 'BUYER_PAYMENT_SUBMITTED'
  | 'PAYMENT_RECEIVED'
  | 'BUYER_PAYMENT_REJECTED'
  | 'TICKET_SENT'
  | 'TICKET_RECEIVED'
  | 'TRANSACTION_COMPLETED'
  | 'TRANSACTION_CANCELLED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  | 'IDENTITY_VERIFIED'
  | 'IDENTITY_REJECTED'
  | 'IDENTITY_SUBMITTED'
  | 'BANK_ACCOUNT_SUBMITTED'
  | 'SELLER_VERIFICATION_COMPLETE'
  | 'EVENT_APPROVED'
  | 'EVENT_REJECTED'
  | 'REVIEW_RECEIVED'
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'OFFER_CANCELLED'
  | 'OFFER_EXPIRED';

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
  BUYER_PAYMENT_SUBMITTED: ['buyerName', 'eventName', 'amount', 'currency', 'amountFormatted', 'transactionId'],
  PAYMENT_RECEIVED: ['title', 'body', 'amountFormatted', 'transactionId'],
  BUYER_PAYMENT_REJECTED: ['sellerName', 'eventName', 'rejectionReason', 'transactionId'],
  TICKET_SENT: ['eventName', 'eventDate', 'venue', 'transactionId'],
  TICKET_RECEIVED: ['eventName', 'transactionId'],
  TRANSACTION_COMPLETED: ['eventName', 'amount', 'currency', 'amountFormatted', 'transactionId'],
  TRANSACTION_CANCELLED: ['eventName', 'cancelledBy', 'reason', 'transactionId'],
  DISPUTE_OPENED: ['eventName', 'openedBy', 'reason', 'disputeId', 'transactionId'],
  DISPUTE_RESOLVED: ['eventName', 'resolution', 'resolvedInFavorOf', 'disputeId', 'transactionId'],
  IDENTITY_VERIFIED: ['userName'],
  IDENTITY_REJECTED: ['userName', 'rejectionReason'],
  IDENTITY_SUBMITTED: ['userName'],
  BANK_ACCOUNT_SUBMITTED: ['userName'],
  SELLER_VERIFICATION_COMPLETE: ['userName'],
  EVENT_APPROVED: ['eventName', 'eventSlug'],
  EVENT_REJECTED: ['eventName', 'eventSlug', 'rejectionReason'],
  REVIEW_RECEIVED: ['reviewerName', 'rating', 'comment', 'transactionId'],
  OFFER_RECEIVED: ['offerId', 'listingId', 'eventName', 'offeredAmount', 'currency', 'amountFormatted'],
  OFFER_ACCEPTED: ['offerId', 'listingId', 'eventName', 'offeredAmount', 'currency', 'amountFormatted'],
  OFFER_REJECTED: ['offerId', 'listingId', 'eventName'],
  OFFER_CANCELLED: ['offerId', 'listingId', 'eventName', 'reason'],
  OFFER_EXPIRED: ['offerId', 'listingId', 'eventName', 'expiredReason'],
};

/** Semantic ordering used for consistent display. */
export const ALL_EVENT_TYPES: NotificationEventType[] = [
  'BUYER_PAYMENT_SUBMITTED',
  'PAYMENT_RECEIVED',
  'BUYER_PAYMENT_REJECTED',
  'TICKET_SENT',
  'TICKET_RECEIVED',
  'TRANSACTION_COMPLETED',
  'TRANSACTION_CANCELLED',
  'DISPUTE_OPENED',
  'DISPUTE_RESOLVED',
  'OFFER_RECEIVED',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'OFFER_CANCELLED',
  'OFFER_EXPIRED',
  'IDENTITY_SUBMITTED',
  'IDENTITY_VERIFIED',
  'IDENTITY_REJECTED',
  'BANK_ACCOUNT_SUBMITTED',
  'SELLER_VERIFICATION_COMPLETE',
  'EVENT_APPROVED',
  'EVENT_REJECTED',
  'REVIEW_RECEIVED',
];

export type NotificationRecipient = 'buyer' | 'seller' | 'admin' | 'counterparty';

/**
 * Who receives each notification type.
 * 'counterparty' = the party that did NOT initiate the action (used for DISPUTE_OPENED).
 * OFFER_EXPIRED lists both because the seller is notified only when reason = buyer_no_purchase.
 */
export const EVENT_TYPE_RECIPIENTS: Record<NotificationEventType, NotificationRecipient[]> = {
  BUYER_PAYMENT_SUBMITTED: ['admin'],
  PAYMENT_RECEIVED: ['buyer', 'seller'],
  BUYER_PAYMENT_REJECTED: ['buyer'],
  TICKET_SENT: ['buyer'],
  TICKET_RECEIVED: ['seller'],
  TRANSACTION_COMPLETED: ['seller'],
  TRANSACTION_CANCELLED: ['buyer', 'seller'],
  DISPUTE_OPENED: ['counterparty'],
  DISPUTE_RESOLVED: ['buyer', 'seller'],
  OFFER_RECEIVED: ['seller'],
  OFFER_ACCEPTED: ['buyer'],
  OFFER_REJECTED: ['buyer'],
  OFFER_CANCELLED: ['buyer'],
  OFFER_EXPIRED: ['buyer', 'seller'],
  IDENTITY_SUBMITTED: ['admin'],
  IDENTITY_VERIFIED: ['seller'],
  IDENTITY_REJECTED: ['seller'],
  BANK_ACCOUNT_SUBMITTED: ['admin'],
  SELLER_VERIFICATION_COMPLETE: ['seller'],
  EVENT_APPROVED: ['seller'],
  EVENT_REJECTED: ['seller'],
  REVIEW_RECEIVED: ['seller'],
};

export interface ChannelGroup {
  labelKey: string;
  types: NotificationEventType[];
}

export const CHANNEL_GROUPS: ChannelGroup[] = [
  {
    labelKey: 'admin.notifications.groups.transactions',
    types: [
      'BUYER_PAYMENT_SUBMITTED',
      'PAYMENT_RECEIVED',
      'BUYER_PAYMENT_REJECTED',
      'TICKET_SENT',
      'TICKET_RECEIVED',
      'TRANSACTION_COMPLETED',
      'TRANSACTION_CANCELLED',
    ],
  },
  {
    labelKey: 'admin.notifications.groups.disputes',
    types: ['DISPUTE_OPENED', 'DISPUTE_RESOLVED'],
  },
  {
    labelKey: 'admin.notifications.groups.offers',
    types: ['OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'OFFER_CANCELLED', 'OFFER_EXPIRED'],
  },
  {
    labelKey: 'admin.notifications.groups.identity',
    types: [
      'IDENTITY_SUBMITTED',
      'IDENTITY_VERIFIED',
      'IDENTITY_REJECTED',
      'BANK_ACCOUNT_SUBMITTED',
      'SELLER_VERIFICATION_COMPLETE',
    ],
  },
  {
    labelKey: 'admin.notifications.groups.events',
    types: ['EVENT_APPROVED', 'EVENT_REJECTED'],
  },
  {
    labelKey: 'admin.notifications.groups.social',
    types: ['REVIEW_RECEIVED'],
  },
];
