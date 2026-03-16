-- AlterTable
ALTER TABLE "events" ADD COLUMN "isPopular" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "events_ranking_config" ADD COLUMN "weightPopular" DOUBLE PRECISION NOT NULL DEFAULT 1;
