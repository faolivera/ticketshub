-- AlterTable
ALTER TABLE "events" ADD COLUMN "ticketApp" TEXT,
ADD COLUMN "transferable" BOOLEAN,
ADD COLUMN "artists" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
