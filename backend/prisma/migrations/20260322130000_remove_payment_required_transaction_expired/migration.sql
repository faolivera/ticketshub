-- Remove PAYMENT_REQUIRED and TRANSACTION_EXPIRED from NotificationEventType enum

-- Step 1: Delete any existing rows using these event types
DELETE FROM "notification_events" WHERE "type" IN ('PAYMENT_REQUIRED', 'TRANSACTION_EXPIRED');
DELETE FROM "notifications" WHERE "eventType" IN ('PAYMENT_REQUIRED', 'TRANSACTION_EXPIRED');
DELETE FROM "notification_templates" WHERE "eventType" IN ('PAYMENT_REQUIRED', 'TRANSACTION_EXPIRED');
DELETE FROM "notification_channel_configs" WHERE "eventType" IN ('PAYMENT_REQUIRED', 'TRANSACTION_EXPIRED');

-- Step 2: Recreate the enum without the removed values
ALTER TYPE "NotificationEventType" RENAME TO "NotificationEventType_old";

CREATE TYPE "NotificationEventType" AS ENUM (
  'BUYER_PAYMENT_SUBMITTED',
  'PAYMENT_RECEIVED',
  'BUYER_PAYMENT_REJECTED',
  'TICKET_TRANSFERRED',
  'TRANSACTION_COMPLETED',
  'TRANSACTION_CANCELLED',
  'DISPUTE_OPENED',
  'DISPUTE_RESOLVED',
  'IDENTITY_VERIFIED',
  'IDENTITY_REJECTED',
  'IDENTITY_SUBMITTED',
  'BANK_ACCOUNT_SUBMITTED',
  'SELLER_VERIFICATION_COMPLETE',
  'EVENT_APPROVED',
  'EVENT_REJECTED',
  'REVIEW_RECEIVED',
  'OFFER_RECEIVED',
  'OFFER_ACCEPTED',
  'OFFER_REJECTED',
  'OFFER_CANCELLED',
  'OFFER_EXPIRED'
);

ALTER TABLE "notification_events" ALTER COLUMN "type" TYPE "NotificationEventType" USING "type"::text::"NotificationEventType";
ALTER TABLE "notifications" ALTER COLUMN "eventType" TYPE "NotificationEventType" USING "eventType"::text::"NotificationEventType";
ALTER TABLE "notification_templates" ALTER COLUMN "eventType" TYPE "NotificationEventType" USING "eventType"::text::"NotificationEventType";
ALTER TABLE "notification_channel_configs" ALTER COLUMN "eventType" TYPE "NotificationEventType" USING "eventType"::text::"NotificationEventType";

DROP TYPE "NotificationEventType_old";
