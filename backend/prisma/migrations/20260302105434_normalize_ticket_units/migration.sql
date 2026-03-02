/*
  Warnings:

  - You are about to drop the column `ticketUnits` on the `ticket_listings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ticket_listings" DROP COLUMN "ticketUnits";

-- CreateTable
CREATE TABLE "ticket_units" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "seatRow" TEXT,
    "seatNumber" TEXT,
    "status" "TicketUnitStatus" NOT NULL DEFAULT 'available',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_units_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ticket_units" ADD CONSTRAINT "ticket_units_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ticket_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
