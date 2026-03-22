-- Rename TICKET_TRANSFERRED → TICKET_SENT and add TICKET_RECEIVED

-- Step 1: Add new enum values
ALTER TYPE "NotificationEventType" ADD VALUE 'TICKET_SENT';
ALTER TYPE "NotificationEventType" ADD VALUE 'TICKET_RECEIVED';

-- Step 2: Migrate existing TICKET_TRANSFERRED rows to TICKET_SENT
UPDATE "notification_events" SET "type" = 'TICKET_SENT' WHERE "type" = 'TICKET_TRANSFERRED';
UPDATE "notifications" SET "eventType" = 'TICKET_SENT' WHERE "eventType" = 'TICKET_TRANSFERRED';
DELETE FROM "notification_templates" WHERE "eventType" = 'TICKET_TRANSFERRED';
DELETE FROM "notification_channel_configs" WHERE "eventType" = 'TICKET_TRANSFERRED';

-- Step 3: Recreate enum without TICKET_TRANSFERRED
ALTER TYPE "NotificationEventType" RENAME TO "NotificationEventType_old";

CREATE TYPE "NotificationEventType" AS ENUM (
  'BUYER_PAYMENT_SUBMITTED',
  'PAYMENT_RECEIVED',
  'BUYER_PAYMENT_REJECTED',
  'TICKET_SENT',
  'TICKET_RECEIVED',
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
