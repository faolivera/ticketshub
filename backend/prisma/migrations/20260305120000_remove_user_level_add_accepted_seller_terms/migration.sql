-- AlterTable: add acceptedSellerTermsAt, backfill from level, drop level, drop enum
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "acceptedSellerTermsAt" TIMESTAMP(3);

-- Backfill: users who were Seller or VerifiedSeller get acceptedSellerTermsAt = COALESCE(tosAcceptedAt, now())
UPDATE "users"
SET "acceptedSellerTermsAt" = COALESCE("tosAcceptedAt", NOW())
WHERE "level" IN ('Seller', 'VerifiedSeller');

-- Drop level column (Prisma schema no longer has it)
ALTER TABLE "users" DROP COLUMN IF EXISTS "level";

-- Drop the UserLevel enum type
DROP TYPE IF EXISTS "UserLevel";
