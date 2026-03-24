-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "NotificationRecipientRole" AS ENUM ('BUYER', 'SELLER', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Step 1: Add nullable columns (idempotent)
ALTER TABLE "notification_templates" ADD COLUMN IF NOT EXISTS "recipientRole" "NotificationRecipientRole";
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipientRole" "NotificationRecipientRole";

-- Step 2: Backfill notification_templates — single-role events
UPDATE "notification_templates" SET "recipientRole" = 'ADMIN'
  WHERE "eventType" IN ('BUYER_PAYMENT_SUBMITTED', 'IDENTITY_SUBMITTED', 'BANK_ACCOUNT_SUBMITTED')
    AND "recipientRole" IS NULL;

UPDATE "notification_templates" SET "recipientRole" = 'BUYER'
  WHERE "eventType" IN ('BUYER_PAYMENT_REJECTED', 'TICKET_SENT', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'OFFER_CANCELLED')
    AND "recipientRole" IS NULL;

UPDATE "notification_templates" SET "recipientRole" = 'SELLER'
  WHERE "eventType" IN ('TICKET_RECEIVED', 'TRANSACTION_COMPLETED', 'IDENTITY_VERIFIED', 'IDENTITY_REJECTED',
                        'SELLER_VERIFICATION_COMPLETE', 'EVENT_APPROVED', 'EVENT_REJECTED', 'REVIEW_RECEIVED', 'OFFER_RECEIVED')
    AND "recipientRole" IS NULL;

-- Step 3: Multi-role events — assign role to existing templates
UPDATE "notification_templates" SET "recipientRole" = 'BUYER'
  WHERE "eventType" = 'PAYMENT_RECEIVED' AND "recipientRole" IS NULL;

UPDATE "notification_templates" SET "recipientRole" = 'BUYER'
  WHERE "eventType" = 'TRANSACTION_CANCELLED' AND "recipientRole" IS NULL;

UPDATE "notification_templates" SET "recipientRole" = 'SELLER'
  WHERE "eventType" = 'DISPUTE_OPENED' AND "recipientRole" IS NULL;

UPDATE "notification_templates" SET "recipientRole" = 'BUYER'
  WHERE "eventType" = 'DISPUTE_RESOLVED' AND "recipientRole" IS NULL;

UPDATE "notification_templates" SET "recipientRole" = 'BUYER'
  WHERE "eventType" = 'OFFER_EXPIRED' AND "recipientRole" IS NULL;

-- Step 4: Drop old unique constraint before inserting placeholders
DROP INDEX IF EXISTS "notification_templates_eventType_channel_locale_key";

-- Insert placeholder templates for remaining roles in multi-role events.
-- Placeholders are inactive (isActive = false) — admin must author them before enabling.

-- PAYMENT_RECEIVED — SELLER placeholder per existing channel × locale
INSERT INTO "notification_templates" ("id", "eventType", "channel", "locale", "recipientRole", "titleTemplate", "bodyTemplate", "actionUrlTemplate", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "eventType", "channel", "locale", 'SELLER'::"NotificationRecipientRole", '', '', "actionUrlTemplate", false, NOW(), NOW()
FROM "notification_templates"
WHERE "eventType" = 'PAYMENT_RECEIVED' AND "recipientRole" = 'BUYER'
ON CONFLICT DO NOTHING;

-- TRANSACTION_CANCELLED — SELLER placeholder
INSERT INTO "notification_templates" ("id", "eventType", "channel", "locale", "recipientRole", "titleTemplate", "bodyTemplate", "actionUrlTemplate", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "eventType", "channel", "locale", 'SELLER'::"NotificationRecipientRole", '', '', "actionUrlTemplate", false, NOW(), NOW()
FROM "notification_templates"
WHERE "eventType" = 'TRANSACTION_CANCELLED' AND "recipientRole" = 'BUYER'
ON CONFLICT DO NOTHING;

-- DISPUTE_OPENED — BUYER placeholder
INSERT INTO "notification_templates" ("id", "eventType", "channel", "locale", "recipientRole", "titleTemplate", "bodyTemplate", "actionUrlTemplate", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "eventType", "channel", "locale", 'BUYER'::"NotificationRecipientRole", '', '', "actionUrlTemplate", false, NOW(), NOW()
FROM "notification_templates"
WHERE "eventType" = 'DISPUTE_OPENED' AND "recipientRole" = 'SELLER'
ON CONFLICT DO NOTHING;

-- DISPUTE_RESOLVED — SELLER placeholder
INSERT INTO "notification_templates" ("id", "eventType", "channel", "locale", "recipientRole", "titleTemplate", "bodyTemplate", "actionUrlTemplate", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "eventType", "channel", "locale", 'SELLER'::"NotificationRecipientRole", '', '', "actionUrlTemplate", false, NOW(), NOW()
FROM "notification_templates"
WHERE "eventType" = 'DISPUTE_RESOLVED' AND "recipientRole" = 'BUYER'
ON CONFLICT DO NOTHING;

-- OFFER_EXPIRED — SELLER placeholder
INSERT INTO "notification_templates" ("id", "eventType", "channel", "locale", "recipientRole", "titleTemplate", "bodyTemplate", "actionUrlTemplate", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "eventType", "channel", "locale", 'SELLER'::"NotificationRecipientRole", '', '', "actionUrlTemplate", false, NOW(), NOW()
FROM "notification_templates"
WHERE "eventType" = 'OFFER_EXPIRED' AND "recipientRole" = 'BUYER'
ON CONFLICT DO NOTHING;

-- Step 5: Backfill notifications table (best-effort for historical records)
UPDATE "notifications" SET "recipientRole" = 'ADMIN'
  WHERE "eventType" IN ('BUYER_PAYMENT_SUBMITTED', 'IDENTITY_SUBMITTED', 'BANK_ACCOUNT_SUBMITTED')
    AND "recipientRole" IS NULL;

UPDATE "notifications" SET "recipientRole" = 'BUYER'
  WHERE "eventType" IN ('BUYER_PAYMENT_REJECTED', 'TICKET_SENT', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'OFFER_CANCELLED',
                        'PAYMENT_RECEIVED', 'TRANSACTION_CANCELLED', 'DISPUTE_RESOLVED', 'OFFER_EXPIRED')
    AND "recipientRole" IS NULL;

UPDATE "notifications" SET "recipientRole" = 'SELLER'
  WHERE "eventType" IN ('TICKET_RECEIVED', 'TRANSACTION_COMPLETED', 'IDENTITY_VERIFIED', 'IDENTITY_REJECTED',
                        'SELLER_VERIFICATION_COMPLETE', 'EVENT_APPROVED', 'EVENT_REJECTED', 'REVIEW_RECEIVED',
                        'OFFER_RECEIVED', 'DISPUTE_OPENED')
    AND "recipientRole" IS NULL;

-- Step 6: Make columns NOT NULL
ALTER TABLE "notification_templates" ALTER COLUMN "recipientRole" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "recipientRole" SET NOT NULL;

-- Step 7: Create new unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_templates_eventType_channel_locale_recipientRole_key" ON "notification_templates"("eventType", "channel", "locale", "recipientRole");
