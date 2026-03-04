-- Simplify TicketType: merge DigitalTransferable and DigitalNonTransferable into Digital

-- Step 1: Add the new Digital enum value
ALTER TYPE "TicketType" ADD VALUE IF NOT EXISTS 'Digital';

-- Step 2: Migrate existing data - both digital types become Digital
UPDATE "ticket_listings" SET "type" = 'Digital' WHERE "type" IN ('DigitalTransferable', 'DigitalNonTransferable');
UPDATE "transactions" SET "ticketType" = 'Digital' WHERE "ticketType" IN ('DigitalTransferable', 'DigitalNonTransferable');

-- Step 3: Drop the 3 dead columns from transactions
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "eventDateTime";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "releaseAfterMinutes";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "autoReleaseAt";

-- Note: PostgreSQL does not support removing enum values directly.
-- The old values (DigitalTransferable, DigitalNonTransferable) will remain
-- in the enum type definition but will no longer be used in any row.
-- They can be cleaned up with a full enum replacement if desired in a future migration.
