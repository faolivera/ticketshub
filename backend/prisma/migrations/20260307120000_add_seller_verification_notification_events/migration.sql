-- Add new notification event types for seller verification flow
ALTER TYPE "NotificationEventType" ADD VALUE 'IDENTITY_SUBMITTED';
ALTER TYPE "NotificationEventType" ADD VALUE 'BANK_ACCOUNT_SUBMITTED';
ALTER TYPE "NotificationEventType" ADD VALUE 'SELLER_VERIFICATION_COMPLETE';
