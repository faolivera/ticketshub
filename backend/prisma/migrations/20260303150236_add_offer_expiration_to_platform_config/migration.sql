-- AlterTable: add offer expiration settings (default 24h = 1440 minutes for existing rows)
ALTER TABLE "platform_config" ADD COLUMN "offer_pending_expiration_minutes" INTEGER NOT NULL DEFAULT 1440;
ALTER TABLE "platform_config" ADD COLUMN "offer_accepted_expiration_minutes" INTEGER NOT NULL DEFAULT 1440;
