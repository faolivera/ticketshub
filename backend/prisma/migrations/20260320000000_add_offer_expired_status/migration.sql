-- Add expired value to OfferStatus enum
-- ALTER TYPE ... ADD VALUE must run outside a transaction in PostgreSQL
ALTER TYPE "OfferStatus" ADD VALUE IF NOT EXISTS 'expired';

-- Create OfferExpiredReason enum
CREATE TYPE "OfferExpiredReason" AS ENUM ('seller_no_response', 'buyer_no_purchase');

-- Add expiredAt and expiredReason columns to offers table
ALTER TABLE "offers"
  ADD COLUMN "expired_at"     TIMESTAMP(3),
  ADD COLUMN "expired_reason" "OfferExpiredReason";
