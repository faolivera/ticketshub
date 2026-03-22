-- Unify BUYER_PAYMENT_APPROVED + SELLER_PAYMENT_RECEIVED into PAYMENT_RECEIVED
-- Note: PAYMENT_RECEIVED was already added to the enum in a prior partial run.

-- Step 1: Migrate notification_events rows to PAYMENT_RECEIVED
UPDATE "notification_events" SET "type" = 'PAYMENT_RECEIVED' WHERE "type" IN ('BUYER_PAYMENT_APPROVED', 'SELLER_PAYMENT_RECEIVED');
UPDATE "notifications" SET "eventType" = 'PAYMENT_RECEIVED' WHERE "eventType" IN ('BUYER_PAYMENT_APPROVED', 'SELLER_PAYMENT_RECEIVED');

-- Step 2: Delete old templates and configs (seeder will recreate the correct ones)
DELETE FROM "notification_templates" WHERE "eventType" IN ('BUYER_PAYMENT_APPROVED', 'SELLER_PAYMENT_RECEIVED');
DELETE FROM "notification_channel_configs" WHERE "eventType" IN ('BUYER_PAYMENT_APPROVED', 'SELLER_PAYMENT_RECEIVED');

-- Step 3: Remove old enum values by recreating the type
ALTER TYPE "NotificationEventType" RENAME TO "NotificationEventType_old";

CREATE TYPE "NotificationEventType" AS ENUM (
  'PAYMENT_REQUIRED',
  'BUYER_PAYMENT_SUBMITTED',
  'PAYMENT_RECEIVED',
  'BUYER_PAYMENT_REJECTED',
  'TICKET_TRANSFERRED',
  'TRANSACTION_COMPLETED',
  'TRANSACTION_CANCELLED',
  'TRANSACTION_EXPIRED',
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
