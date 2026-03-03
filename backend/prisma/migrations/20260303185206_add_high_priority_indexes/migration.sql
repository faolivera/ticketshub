-- CreateIndex
CREATE INDEX "notification_events_status_idx" ON "notification_events"("status");

-- CreateIndex
CREATE INDEX "notification_events_status_triggeredAt_idx" ON "notification_events"("status", "triggeredAt" ASC);

-- CreateIndex
CREATE INDEX "notifications_recipientId_channel_idx" ON "notifications"("recipientId", "channel");

-- CreateIndex
CREATE INDEX "notifications_recipientId_channel_read_idx" ON "notifications"("recipientId", "channel", "read");

-- CreateIndex
CREATE INDEX "notifications_channel_status_idx" ON "notifications"("channel", "status");

-- CreateIndex
CREATE INDEX "notifications_eventId_idx" ON "notifications"("eventId");

-- CreateIndex
CREATE INDEX "ticket_listings_status_idx" ON "ticket_listings"("status");

-- CreateIndex
CREATE INDEX "ticket_listings_sellerId_idx" ON "ticket_listings"("sellerId");

-- CreateIndex
CREATE INDEX "ticket_listings_eventId_idx" ON "ticket_listings"("eventId");

-- CreateIndex
CREATE INDEX "ticket_listings_eventDateId_idx" ON "ticket_listings"("eventDateId");

-- CreateIndex
CREATE INDEX "ticket_listings_eventSectionId_idx" ON "ticket_listings"("eventSectionId");

-- CreateIndex
CREATE INDEX "ticket_listings_eventId_status_idx" ON "ticket_listings"("eventId", "status");

-- CreateIndex
CREATE INDEX "ticket_listings_eventDateId_status_idx" ON "ticket_listings"("eventDateId", "status");

-- CreateIndex
CREATE INDEX "ticket_listings_eventSectionId_status_idx" ON "ticket_listings"("eventSectionId", "status");

-- CreateIndex
CREATE INDEX "ticket_listings_status_createdAt_idx" ON "ticket_listings"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ticket_units_listingId_idx" ON "ticket_units"("listingId");

-- CreateIndex
CREATE INDEX "ticket_units_listingId_status_idx" ON "ticket_units"("listingId", "status");

-- CreateIndex
CREATE INDEX "transactions_buyerId_idx" ON "transactions"("buyerId");

-- CreateIndex
CREATE INDEX "transactions_sellerId_idx" ON "transactions"("sellerId");

-- CreateIndex
CREATE INDEX "transactions_listingId_idx" ON "transactions"("listingId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_status_paymentExpiresAt_idx" ON "transactions"("status", "paymentExpiresAt");

-- CreateIndex
CREATE INDEX "transactions_status_adminReviewExpiresAt_idx" ON "transactions"("status", "adminReviewExpiresAt");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt" DESC);
