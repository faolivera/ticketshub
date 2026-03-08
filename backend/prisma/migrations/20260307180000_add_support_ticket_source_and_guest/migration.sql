-- CreateEnum
CREATE TYPE "SupportTicketSource" AS ENUM ('dispute', 'contact_from_transaction', 'contact_form');

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "guestId" TEXT;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "guestName" TEXT;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "guestEmail" TEXT;
ALTER TABLE "support_tickets" ADD COLUMN IF NOT EXISTS "source" "SupportTicketSource";
ALTER TABLE "support_tickets" ALTER COLUMN "userId" DROP NOT NULL;
