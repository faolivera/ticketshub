-- CreateTable
CREATE TABLE "event_require_scoring" (
    "eventId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_require_scoring_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "events_ranking_config" (
    "id" TEXT NOT NULL,
    "weightActiveListings" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "weightTransactions" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "weightProximity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "jobIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "lastRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_ranking_config_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "events" ADD COLUMN "rankingScore" DOUBLE PRECISION,
ADD COLUMN "rankingUpdatedAt" TIMESTAMP(3);

-- Insert default config row
INSERT INTO "events_ranking_config" ("id", "weightActiveListings", "weightTransactions", "weightProximity", "jobIntervalMinutes", "updatedAt")
VALUES ('default', 1, 1, 0.5, 5, CURRENT_TIMESTAMP);

-- AddForeignKey
ALTER TABLE "event_require_scoring" ADD CONSTRAINT "event_require_scoring_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
