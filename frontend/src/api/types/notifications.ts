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

export type NotificationRecipientRole = 'BUYER' | 'SELLER' | 'ADMIN';

export interface NotificationTemplate {
  id: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  locale: string;
  recipientRole: NotificationRecipientRole;
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

export interface CreateTemplateRequest {
  eventType: NotificationEventType;
  channel: NotificationChannel;
  locale: string;
  recipientRole: NotificationRecipientRole;
  titleTemplate: string;
  bodyTemplate: string;
  actionUrlTemplate?: string;
}

export interface GetNotificationEventDetailResponse {
  eventType: NotificationEventType;
  channelConfig: NotificationChannelConfig;
  templatesByRole: Partial<Record<NotificationRecipientRole, {
    role: NotificationRecipientRole;
    templates: NotificationTemplate[];
  }>>;
}

/**
 * Available template variables per event type and recipient role.
 * Use getTemplateVariables(eventType, role) to get variables for a specific combination.
 */
export const TEMPLATE_VARIABLES: Record<NotificationEventType, Partial<Record<NotificationRecipientRole, string[]>>> = {
  BUYER_PAYMENT_SUBMITTED: {
    ADMIN: ['buyerName', 'eventName', 'amount', 'currency', 'amountFormatted', 'transactionId'],
  },
  PAYMENT_RECEIVED: {
    BUYER: ['eventName', 'amountFormatted', 'transactionId'],
    SELLER: ['eventName', 'ticketCount', 'amountFormatted', 'transactionId'],
  },
  BUYER_PAYMENT_REJECTED: {
    BUYER: ['sellerName', 'eventName', 'rejectionReason', 'transactionId'],
  },
  TICKET_SENT: {
    BUYER: ['eventName', 'eventDate', 'venue', 'transactionId'],
  },
  TICKET_RECEIVED: {
    SELLER: ['eventName', 'transactionId'],
  },
  TRANSACTION_COMPLETED: {
    SELLER: ['eventName', 'amount', 'currency', 'amountFormatted', 'transactionId'],
  },
  TRANSACTION_CANCELLED: {
    BUYER: ['eventName', 'cancelledBy', 'reason', 'transactionId'],
    SELLER: ['eventName', 'cancelledBy', 'reason', 'transactionId'],
  },
  DISPUTE_OPENED: {
    BUYER: ['eventName', 'openedBy', 'reason', 'disputeId', 'transactionId'],
    SELLER: ['eventName', 'openedBy', 'reason', 'disputeId', 'transactionId'],
  },
  DISPUTE_RESOLVED: {
    BUYER: ['eventName', 'resolution', 'resolvedInFavorOf', 'disputeId', 'transactionId'],
    SELLER: ['eventName', 'resolution', 'resolvedInFavorOf', 'disputeId', 'transactionId'],
  },
  IDENTITY_VERIFIED: {
    SELLER: ['userName'],
  },
  IDENTITY_REJECTED: {
    SELLER: ['userName', 'rejectionReason'],
  },
  IDENTITY_SUBMITTED: {
    ADMIN: ['userName'],
  },
  BANK_ACCOUNT_SUBMITTED: {
    ADMIN: ['userName'],
  },
  SELLER_VERIFICATION_COMPLETE: {
    SELLER: ['userName'],
  },
  EVENT_APPROVED: {
    SELLER: ['eventName', 'eventSlug'],
  },
  EVENT_REJECTED: {
    SELLER: ['eventName', 'eventSlug', 'rejectionReason'],
  },
  REVIEW_RECEIVED: {
    SELLER: ['reviewerName', 'rating', 'comment', 'transactionId'],
  },
  OFFER_RECEIVED: {
    SELLER: ['offerId', 'listingId', 'eventName', 'offeredAmount', 'currency', 'amountFormatted'],
  },
  OFFER_ACCEPTED: {
    BUYER: ['offerId', 'listingId', 'eventName', 'offeredAmount', 'currency', 'amountFormatted'],
  },
  OFFER_REJECTED: {
    BUYER: ['offerId', 'listingId', 'eventName'],
  },
  OFFER_CANCELLED: {
    BUYER: ['offerId', 'listingId', 'eventName', 'reason'],
  },
  OFFER_EXPIRED: {
    BUYER: ['offerId', 'listingId', 'eventName', 'expiredReason'],
    SELLER: ['offerId', 'listingId', 'eventName', 'expiredReason'],
  },
};

/** Get template variables for a specific event type and recipient role. */
export function getTemplateVariables(
  eventType: NotificationEventType,
  role: NotificationRecipientRole,
): string[] {
  return TEMPLATE_VARIABLES[eventType][role] ?? [];
}

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

/**
 * Which roles receive templates for each notification event type.
 * DISPUTE_OPENED sends to BUYER or SELLER depending on who opened it,
 * so templates for both roles must exist.
 */
export const EVENT_TYPE_RECIPIENTS: Record<NotificationEventType, NotificationRecipientRole[]> = {
  BUYER_PAYMENT_SUBMITTED: ['ADMIN'],
  PAYMENT_RECEIVED: ['BUYER', 'SELLER'],
  BUYER_PAYMENT_REJECTED: ['BUYER'],
  TICKET_SENT: ['BUYER'],
  TICKET_RECEIVED: ['SELLER'],
  TRANSACTION_COMPLETED: ['SELLER'],
  TRANSACTION_CANCELLED: ['BUYER', 'SELLER'],
  DISPUTE_OPENED: ['BUYER', 'SELLER'],
  DISPUTE_RESOLVED: ['BUYER', 'SELLER'],
  OFFER_RECEIVED: ['SELLER'],
  OFFER_ACCEPTED: ['BUYER'],
  OFFER_REJECTED: ['BUYER'],
  OFFER_CANCELLED: ['BUYER'],
  OFFER_EXPIRED: ['BUYER', 'SELLER'],
  IDENTITY_SUBMITTED: ['ADMIN'],
  IDENTITY_VERIFIED: ['SELLER'],
  IDENTITY_REJECTED: ['SELLER'],
  BANK_ACCOUNT_SUBMITTED: ['ADMIN'],
  SELLER_VERIFICATION_COMPLETE: ['SELLER'],
  EVENT_APPROVED: ['SELLER'],
  EVENT_REJECTED: ['SELLER'],
  REVIEW_RECEIVED: ['SELLER'],
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
