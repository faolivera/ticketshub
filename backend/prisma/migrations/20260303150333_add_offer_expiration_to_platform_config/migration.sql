-- AlterTable
ALTER TABLE "platform_config" ALTER COLUMN "offer_pending_expiration_minutes" DROP DEFAULT,
ALTER COLUMN "offer_accepted_expiration_minutes" DROP DEFAULT;
