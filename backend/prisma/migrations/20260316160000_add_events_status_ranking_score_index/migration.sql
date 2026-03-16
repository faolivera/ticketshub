-- CreateIndex
CREATE INDEX "events_status_rankingScore_idx" ON "events"("status", "rankingScore" DESC);
