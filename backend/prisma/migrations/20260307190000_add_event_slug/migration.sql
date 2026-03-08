-- Add slug column (nullable first for backfill)
ALTER TABLE "events" ADD COLUMN "slug" TEXT;

-- Backfill: unique slug for existing events (event-{id})
UPDATE "events" SET "slug" = 'event-' || id WHERE "slug" IS NULL;

-- Set NOT NULL and add unique constraint
ALTER TABLE "events" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
