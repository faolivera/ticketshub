-- Use the new Digital enum value (must run after 20260304200000 which adds it).
-- Migrate existing data: both digital types become Digital
UPDATE "ticket_listings" SET "type" = 'Digital' WHERE "type" IN ('DigitalTransferable', 'DigitalNonTransferable');
UPDATE "transactions" SET "ticketType" = 'Digital' WHERE "ticketType" IN ('DigitalTransferable', 'DigitalNonTransferable');

-- Drop the 3 dead columns from transactions
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "eventDateTime";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "releaseAfterMinutes";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "autoReleaseAt";
