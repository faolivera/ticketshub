-- CreateEnum
CREATE TYPE "Role" AS ENUM ('User', 'Admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Enabled', 'Disabled', 'Suspended');

-- CreateEnum
CREATE TYPE "UserLevel" AS ENUM ('Basic', 'Buyer', 'Seller', 'VerifiedSeller');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('es', 'en');

-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "EventDateStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "EventSectionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('Concert', 'Sports', 'Theater', 'Festival', 'Conference', 'Comedy', 'Other');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('Physical', 'DigitalTransferable', 'DigitalNonTransferable');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('Pickup', 'ArrangeWithSeller');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('Pending', 'Active', 'Sold', 'Cancelled', 'Expired');

-- CreateEnum
CREATE TYPE "TicketUnitStatus" AS ENUM ('available', 'reserved', 'sold');

-- CreateEnum
CREATE TYPE "SeatingType" AS ENUM ('numbered', 'unnumbered');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PendingPayment', 'PaymentPendingVerification', 'PaymentReceived', 'TicketTransferred', 'Completed', 'Disputed', 'Refunded', 'Cancelled');

-- CreateEnum
CREATE TYPE "RequiredActor" AS ENUM ('Buyer', 'Seller', 'Platform', 'None');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('BuyerCancelled', 'PaymentFailed', 'PaymentTimeout', 'AdminRejected', 'AdminReviewTimeout');

-- CreateEnum
CREATE TYPE "PaymentIntentStatus" AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentConfirmationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('credit', 'debit', 'pending_credit', 'pending_release', 'payout');

-- CreateEnum
CREATE TYPE "OTPType" AS ENUM ('email_verification', 'phone_verification', 'password_reset');

-- CreateEnum
CREATE TYPE "OTPStatus" AS ENUM ('pending', 'verified', 'expired');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('transaction', 'account', 'technical', 'other');

-- CreateEnum
CREATE TYPE "SupportMessageSender" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "ReviewRole" AS ENUM ('buyer', 'seller');

-- CreateEnum
CREATE TYPE "TermsUserType" AS ENUM ('buyer', 'seller');

-- CreateEnum
CREATE TYPE "TermsStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('PAYMENT_REQUIRED', 'BUYER_PAYMENT_SUBMITTED', 'BUYER_PAYMENT_APPROVED', 'BUYER_PAYMENT_REJECTED', 'TICKET_TRANSFERRED', 'TRANSACTION_COMPLETED', 'TRANSACTION_CANCELLED', 'TRANSACTION_EXPIRED', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'IDENTITY_VERIFIED', 'IDENTITY_REJECTED', 'EVENT_APPROVED', 'EVENT_REJECTED', 'REVIEW_RECEIVED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'User',
    "level" "UserLevel" NOT NULL DEFAULT 'Basic',
    "status" "UserStatus" NOT NULL DEFAULT 'Enabled',
    "publicName" TEXT NOT NULL,
    "imageId" TEXT,
    "phone" TEXT,
    "password" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Germany',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "language" "Language" NOT NULL DEFAULT 'en',
    "address" JSONB,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "tosAcceptedAt" TIMESTAMP(3),
    "identityVerification" JSONB,
    "bankAccount" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "venue" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "imageIds" TEXT[],
    "banners" JSONB,
    "status" "EventStatus" NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_dates" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "EventDateStatus" NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sections" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seatingType" "SeatingType" NOT NULL,
    "status" "EventSectionStatus" NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_listings" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventDateId" TEXT NOT NULL,
    "eventSectionId" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "ticketUnits" JSONB NOT NULL,
    "sellTogether" BOOLEAN NOT NULL DEFAULT false,
    "pricePerTicket" JSONB NOT NULL,
    "deliveryMethod" "DeliveryMethod",
    "pickupAddress" JSONB,
    "description" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'Pending',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "ticketType" "TicketType" NOT NULL,
    "ticketUnitIds" TEXT[],
    "quantity" INTEGER NOT NULL,
    "ticketPrice" JSONB NOT NULL,
    "buyerPlatformFee" JSONB NOT NULL,
    "sellerPlatformFee" JSONB NOT NULL,
    "paymentMethodCommission" JSONB NOT NULL,
    "totalPaid" JSONB NOT NULL,
    "sellerReceives" JSONB NOT NULL,
    "pricingSnapshotId" TEXT NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PendingPayment',
    "requiredActor" "RequiredActor" NOT NULL DEFAULT 'Buyer',
    "paymentExpiresAt" TIMESTAMP(3) NOT NULL,
    "adminReviewExpiresAt" TIMESTAMP(3),
    "deliveryMethod" "DeliveryMethod",
    "pickupAddress" JSONB,
    "eventDateTime" TIMESTAMP(3),
    "releaseAfterMinutes" INTEGER,
    "autoReleaseAt" TIMESTAMP(3),
    "disputeId" TEXT,
    "paymentMethodId" TEXT,
    "paymentConfirmationId" TEXT,
    "paymentApprovedBy" TEXT,
    "paymentApprovedAt" TIMESTAMP(3),
    "cancelledBy" "RequiredActor",
    "cancellationReason" "CancellationReason",
    "paymentReceivedAt" TIMESTAMP(3),
    "ticketTransferredAt" TIMESTAMP(3),
    "buyerConfirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" JSONB NOT NULL,
    "status" "PaymentIntentStatus" NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enabled',
    "commissionPercent" DOUBLE PRECISION NOT NULL,
    "commissionFixed" INTEGER NOT NULL DEFAULT 0,
    "instructions" JSONB,
    "requiredFields" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_confirmations" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "status" "PaymentConfirmationStatus" NOT NULL DEFAULT 'pending',
    "imageIds" TEXT[],
    "fields" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_snapshots" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "pricePerTicket" JSONB NOT NULL,
    "buyerPlatformFeePercentage" DOUBLE PRECISION NOT NULL,
    "sellerPlatformFeePercentage" DOUBLE PRECISION NOT NULL,
    "paymentMethodCommissions" JSONB NOT NULL,
    "pricingModel" TEXT NOT NULL DEFAULT 'fixed',
    "bestOfferConfig" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "consumedByTransactionId" TEXT,
    "selectedPaymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" JSONB NOT NULL,
    "pendingBalance" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletUserId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" JSONB NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "OTPType" NOT NULL,
    "code" TEXT NOT NULL,
    "status" "OTPStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "reviewerRole" "ReviewRole" NOT NULL,
    "revieweeRole" "ReviewRole" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "terms_versions" (
    "id" TEXT NOT NULL,
    "userType" "TermsUserType" NOT NULL,
    "version" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "TermsStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "terms_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_terms_acceptances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "termsVersionId" TEXT NOT NULL,
    "userType" "TermsUserType" NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_terms_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_terms_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "TermsUserType" NOT NULL,
    "currentTermsVersionId" TEXT,
    "acceptedTermsVersionId" TEXT,
    "needsAcceptance" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_terms_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity_verification_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "IdentityVerificationStatus" NOT NULL DEFAULT 'pending',
    "legalFirstName" TEXT NOT NULL,
    "legalLastName" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "governmentIdNumber" TEXT NOT NULL,
    "documentImageIds" TEXT[],
    "selfieImageId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "identity_verification_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionId" TEXT,
    "category" "SupportTicketCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "sender" "SupportMessageSender" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_events" (
    "id" TEXT NOT NULL,
    "type" "NotificationEventType" NOT NULL,
    "context" JSONB NOT NULL,
    "triggeredBy" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "NotificationEventStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "locale" TEXT NOT NULL,
    "titleTemplate" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "actionUrlTemplate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_channel_configs" (
    "id" TEXT NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "notification_channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "event_sections_eventId_name_key" ON "event_sections"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_transactionId_key" ON "payment_intents"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_confirmations_transactionId_key" ON "payment_confirmations"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_transactionId_reviewerId_key" ON "reviews"("transactionId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "user_terms_acceptances_userId_termsVersionId_key" ON "user_terms_acceptances"("userId", "termsVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_terms_states_userId_userType_key" ON "user_terms_states"("userId", "userType");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_eventType_channel_locale_key" ON "notification_templates"("eventType", "channel", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "notification_channel_configs_eventType_key" ON "notification_channel_configs"("eventType");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_dates" ADD CONSTRAINT "event_dates_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_dates" ADD CONSTRAINT "event_dates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_dates" ADD CONSTRAINT "event_dates_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sections" ADD CONSTRAINT "event_sections_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sections" ADD CONSTRAINT "event_sections_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sections" ADD CONSTRAINT "event_sections_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_listings" ADD CONSTRAINT "ticket_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_listings" ADD CONSTRAINT "ticket_listings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_listings" ADD CONSTRAINT "ticket_listings_eventDateId_fkey" FOREIGN KEY ("eventDateId") REFERENCES "event_dates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_listings" ADD CONSTRAINT "ticket_listings_eventSectionId_fkey" FOREIGN KEY ("eventSectionId") REFERENCES "event_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ticket_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletUserId_fkey" FOREIGN KEY ("walletUserId") REFERENCES "wallets"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otps" ADD CONSTRAINT "otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity_verification_requests" ADD CONSTRAINT "identity_verification_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "notification_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
