/*
  Warnings:

  - The values [DigitalTransferable,DigitalNonTransferable] on the enum `TicketType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TicketType_new" AS ENUM ('Physical', 'Digital');
ALTER TABLE "ticket_listings" ALTER COLUMN "type" TYPE "TicketType_new" USING ("type"::text::"TicketType_new");
ALTER TABLE "transactions" ALTER COLUMN "ticketType" TYPE "TicketType_new" USING ("ticketType"::text::"TicketType_new");
ALTER TYPE "TicketType" RENAME TO "TicketType_old";
ALTER TYPE "TicketType_new" RENAME TO "TicketType";
DROP TYPE "public"."TicketType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_userId_fkey";

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "importInfo" JSONB;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
