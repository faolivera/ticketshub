-- CreateIndex
CREATE INDEX "offers_listingId_idx" ON "offers"("listingId");

-- CreateIndex
CREATE INDEX "offers_userId_idx" ON "offers"("userId");

-- CreateIndex
CREATE INDEX "offers_listingId_status_idx" ON "offers"("listingId", "status");

-- CreateIndex
CREATE INDEX "offers_userId_listingId_status_idx" ON "offers"("userId", "listingId", "status");

-- CreateIndex
CREATE INDEX "pricing_snapshots_listingId_idx" ON "pricing_snapshots"("listingId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletUserId_idx" ON "wallet_transactions"("walletUserId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletUserId_type_idx" ON "wallet_transactions"("walletUserId", "type");

-- CreateIndex
CREATE INDEX "otps_userId_idx" ON "otps"("userId");

-- CreateIndex
CREATE INDEX "otps_userId_type_idx" ON "otps"("userId", "type");

-- CreateIndex
CREATE INDEX "otps_userId_type_status_idx" ON "otps"("userId", "type", "status");

-- CreateIndex
CREATE INDEX "reviews_revieweeId_revieweeRole_idx" ON "reviews"("revieweeId", "revieweeRole");

-- CreateIndex
CREATE INDEX "identity_verification_requests_userId_idx" ON "identity_verification_requests"("userId");

-- CreateIndex
CREATE INDEX "identity_verification_requests_status_idx" ON "identity_verification_requests"("status");

-- CreateIndex
CREATE INDEX "identity_verification_requests_userId_status_idx" ON "identity_verification_requests"("userId", "status");

-- CreateIndex
CREATE INDEX "support_tickets_userId_idx" ON "support_tickets"("userId");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_messages_ticketId_idx" ON "support_messages"("ticketId");
