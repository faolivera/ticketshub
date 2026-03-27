-- CreateEnum
CREATE TYPE "Role" AS ENUM ('User', 'Admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('Enabled', 'Disabled', 'Suspended');

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
CREATE TYPE "TicketType" AS ENUM ('Physical', 'Digital');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('Pickup', 'ArrangeWithSeller');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('Pending', 'Active', 'Sold', 'Cancelled', 'Expired');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('pending', 'accepted', 'rejected', 'converted', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "OfferExpiredReason" AS ENUM ('seller_no_response', 'buyer_no_purchase');

-- CreateEnum
CREATE TYPE "TicketUnitStatus" AS ENUM ('available', 'reserved', 'sold');

-- CreateEnum
CREATE TYPE "SeatingType" AS ENUM ('numbered', 'unnumbered');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PendingPayment', 'PaymentPendingVerification', 'PaymentReceived', 'TicketTransferred', 'DepositHold', 'TransferringFund', 'Completed', 'Disputed', 'Refunded', 'Cancelled');

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
CREATE TYPE "SupportTicketCategory" AS ENUM ('transaction', 'account', 'technical', 'other', 'ticket_not_received', 'ticket_didnt_work', 'buyer_did_not_confirm_receipt', 'payment_issue');

-- CreateEnum
CREATE TYPE "SupportTicketSource" AS ENUM ('dispute', 'contact_from_transaction', 'contact_form');

-- CreateEnum
CREATE TYPE "SupportMessageSender" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "ReviewRole" AS ENUM ('buyer', 'seller');

-- CreateEnum
CREATE TYPE "TermsUserType" AS ENUM ('buyer', 'seller');

-- CreateEnum
CREATE TYPE "TermsStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('SELLER_DISCOUNTED_FEE', 'BUYER_DISCOUNTED_FEE');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "PromotionConfigTarget" AS ENUM ('seller', 'verified_seller', 'buyer', 'verified_buyer');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('BUYER_PAYMENT_SUBMITTED', 'PAYMENT_RECEIVED', 'BUYER_PAYMENT_REJECTED', 'TICKET_SENT', 'TICKET_RECEIVED', 'TRANSACTION_COMPLETED', 'TRANSACTION_CANCELLED', 'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'IDENTITY_VERIFIED', 'IDENTITY_REJECTED', 'IDENTITY_SUBMITTED', 'BANK_ACCOUNT_SUBMITTED', 'SELLER_VERIFICATION_COMPLETE', 'EVENT_APPROVED', 'EVENT_REJECTED', 'REVIEW_RECEIVED', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 'OFFER_CANCELLED', 'OFFER_EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationRecipientRole" AS ENUM ('BUYER', 'SELLER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'User',
    "status" "UserStatus" NOT NULL DEFAULT 'Enabled',
    "publicName" TEXT NOT NULL,
    "imageId" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "googleId" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Germany',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "language" "Language" NOT NULL DEFAULT 'en',
    "address" JSONB,
    "acceptedSellerTermsAt" TIMESTAMP(3),
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "tosAcceptedAt" TIMESTAMP(3),
    "identityVerification" JSONB,
    "bankAccount" JSONB,
    "buyerDisputed" BOOLEAN NOT NULL DEFAULT false,
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
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "venue" TEXT NOT NULL,
    "location" JSONB NOT NULL,
    "imageIds" TEXT[],
    "banners" JSONB,
    "importInfo" JSONB,
    "status" "EventStatus" NOT NULL DEFAULT 'pending',
    "rejectionReason" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rankingScore" DOUBLE PRECISION,
    "rankingUpdatedAt" TIMESTAMP(3),
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "ticketApp" TEXT,
    "transferable" BOOLEAN,
    "artists" TEXT[] DEFAULT ARRAY[]::TEXT[],

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
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PromotionType" NOT NULL,
    "config" JSONB NOT NULL,
    "maxUsages" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "usedInListingIds" JSONB NOT NULL,
    "status" "PromotionStatus" NOT NULL DEFAULT 'active',
    "validUntil" TIMESTAMP(3),
    "promotionCodeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_codes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "promotionConfig" JSONB NOT NULL,
    "target" "PromotionConfigTarget" NOT NULL,
    "maxUsages" INTEGER NOT NULL DEFAULT 0,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "promotion_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_listings" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventDateId" TEXT NOT NULL,
    "eventSectionId" TEXT NOT NULL,
    "type" "TicketType" NOT NULL,
    "sellTogether" BOOLEAN NOT NULL DEFAULT false,
    "pricePerTicket" JSONB NOT NULL,
    "bestOfferConfig" JSONB,
    "deliveryMethod" "DeliveryMethod",
    "pickupAddress" JSONB,
    "promotionSnapshot" JSONB,
    "status" "ListingStatus" NOT NULL DEFAULT 'Pending',
    "version" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_listings_pkey" PRIMARY KEY ("id")
);

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
    "offerId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PendingPayment',
    "requiredActor" "RequiredActor" NOT NULL DEFAULT 'Buyer',
    "version" INTEGER NOT NULL DEFAULT 1,
    "paymentExpiresAt" TIMESTAMP(3) NOT NULL,
    "adminReviewExpiresAt" TIMESTAMP(3),
    "deliveryMethod" "DeliveryMethod",
    "pickupAddress" JSONB,
    "depositReleaseAt" TIMESTAMP(3),
    "disputeId" TEXT,
    "paymentMethodId" TEXT,
    "paymentConfirmationId" TEXT,
    "paymentApprovedBy" TEXT,
    "paymentApprovedAt" TIMESTAMP(3),
    "cancelledBy" "RequiredActor",
    "cancellationReason" "CancellationReason",
    "paymentReceivedAt" TIMESTAMP(3),
    "ticketTransferredAt" TIMESTAMP(3),
    "seller_sent_payload_type" TEXT,
    "seller_sent_payload_type_other_text" TEXT,
    "buyerConfirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "buyer_delivery_email" TEXT,
    "transfer_proof_storage_key" TEXT,
    "transfer_proof_original_filename" TEXT,
    "receipt_proof_storage_key" TEXT,
    "receipt_proof_original_filename" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_audit_logs" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "transaction_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_chat_messages" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "payload_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_by_buyer_at" TIMESTAMP(3),
    "read_by_seller_at" TIMESTAMP(3),

    CONSTRAINT "transaction_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "offeredPrice" JSONB NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'pending',
    "tickets" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedExpiresAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "convertedTransactionId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "expired_reason" "OfferExpiredReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
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
    "visible" BOOLEAN NOT NULL DEFAULT true,
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
CREATE TABLE "payout_receipt_files" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_receipt_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_snapshots" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "pricePerTicket" JSONB NOT NULL,
    "buyerPlatformFeePercentage" DOUBLE PRECISION NOT NULL,
    "sellerPlatformFeePercentage" DOUBLE PRECISION NOT NULL,
    "paymentMethodCommissions" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
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
    "version" INTEGER NOT NULL DEFAULT 1,
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
    "destination" TEXT,

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
    "userId" TEXT,
    "guestId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "transactionId" TEXT,
    "category" "SupportTicketCategory" NOT NULL,
    "source" "SupportTicketSource",
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
    "version" INTEGER NOT NULL DEFAULT 1,
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
    "recipientRole" "NotificationRecipientRole" NOT NULL,
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
    "recipientRole" "NotificationRecipientRole" NOT NULL,
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

-- CreateTable
CREATE TABLE "scheduler_locks" (
    "id" TEXT NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduler_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_require_scoring" (
    "eventId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "events_ranking_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "weightActiveListings" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "weightTransactions" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "weightProximity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "weightPopular" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "jobIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "lastRunAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_ranking_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "buyer_platform_fee_percentage" DOUBLE PRECISION NOT NULL,
    "seller_platform_fee_percentage" DOUBLE PRECISION NOT NULL,
    "payment_timeout_minutes" INTEGER NOT NULL,
    "admin_review_timeout_hours" INTEGER NOT NULL,
    "offer_pending_expiration_minutes" INTEGER NOT NULL,
    "offer_accepted_expiration_minutes" INTEGER NOT NULL,
    "transaction_chat_poll_interval_seconds" INTEGER NOT NULL,
    "transaction_chat_max_messages" INTEGER NOT NULL,
    "minimum_hours_to_buy_tickets" INTEGER NOT NULL DEFAULT 0,
    "risk_engine" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_orders" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_subscriptions" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "subscriptionType" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_refunds" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "gatewayOrderId" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "apiCallLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");

-- CreateIndex
CREATE INDEX "events_status_rankingScore_idx" ON "events"("status", "rankingScore" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "event_sections_eventId_name_key" ON "event_sections"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_codes_code_key" ON "promotion_codes"("code");

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
CREATE INDEX "transactions_status_depositReleaseAt_idx" ON "transactions"("status", "depositReleaseAt");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "transaction_audit_logs_transaction_id_idx" ON "transaction_audit_logs"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_audit_logs_transaction_id_changed_at_idx" ON "transaction_audit_logs"("transaction_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "transaction_chat_messages_transaction_id_idx" ON "transaction_chat_messages"("transaction_id");

-- CreateIndex
CREATE INDEX "offers_listingId_idx" ON "offers"("listingId");

-- CreateIndex
CREATE INDEX "offers_userId_idx" ON "offers"("userId");

-- CreateIndex
CREATE INDEX "offers_listingId_status_idx" ON "offers"("listingId", "status");

-- CreateIndex
CREATE INDEX "offers_userId_listingId_status_idx" ON "offers"("userId", "listingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_transactionId_key" ON "payment_intents"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_confirmations_transactionId_key" ON "payment_confirmations"("transactionId");

-- CreateIndex
CREATE INDEX "payout_receipt_files_transactionId_idx" ON "payout_receipt_files"("transactionId");

-- CreateIndex
CREATE INDEX "pricing_snapshots_listingId_idx" ON "pricing_snapshots"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

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
CREATE UNIQUE INDEX "reviews_transactionId_reviewerId_key" ON "reviews"("transactionId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "user_terms_acceptances_userId_termsVersionId_key" ON "user_terms_acceptances"("userId", "termsVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_terms_states_userId_userType_key" ON "user_terms_states"("userId", "userType");

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
CREATE UNIQUE INDEX "notification_templates_eventType_channel_locale_recipientRo_key" ON "notification_templates"("eventType", "channel", "locale", "recipientRole");

-- CreateIndex
CREATE UNIQUE INDEX "notification_channel_configs_eventType_key" ON "notification_channel_configs"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "event_require_scoring_eventId_key" ON "event_require_scoring"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_orders_transactionId_key" ON "gateway_orders"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "gateway_orders_providerOrderId_key" ON "gateway_orders"("providerOrderId");

-- CreateIndex
CREATE INDEX "gateway_orders_status_idx" ON "gateway_orders"("status");

-- CreateIndex
CREATE INDEX "gateway_orders_transactionId_status_idx" ON "gateway_orders"("transactionId", "status");

-- CreateIndex
CREATE INDEX "event_subscriptions_eventId_subscriptionType_idx" ON "event_subscriptions"("eventId", "subscriptionType");

-- CreateIndex
CREATE INDEX "event_subscriptions_email_idx" ON "event_subscriptions"("email");

-- CreateIndex
CREATE UNIQUE INDEX "event_subscriptions_eventId_subscriptionType_email_key" ON "event_subscriptions"("eventId", "subscriptionType", "email");

-- CreateIndex
CREATE INDEX "gateway_refunds_status_idx" ON "gateway_refunds"("status");

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
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_listings" ADD CONSTRAINT "ticket_listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_listings" ADD CONSTRAINT "ticket_listings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_listings" ADD CONSTRAINT "ticket_listings_eventDateId_fkey" FOREIGN KEY ("eventDateId") REFERENCES "event_dates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_listings" ADD CONSTRAINT "ticket_listings_eventSectionId_fkey" FOREIGN KEY ("eventSectionId") REFERENCES "event_sections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_units" ADD CONSTRAINT "ticket_units_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ticket_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ticket_listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_audit_logs" ADD CONSTRAINT "transaction_audit_logs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_chat_messages" ADD CONSTRAINT "transaction_chat_messages_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ticket_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_confirmations" ADD CONSTRAINT "payment_confirmations_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payout_receipt_files" ADD CONSTRAINT "payout_receipt_files_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "notification_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_require_scoring" ADD CONSTRAINT "event_require_scoring_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_orders" ADD CONSTRAINT "gateway_orders_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_subscriptions" ADD CONSTRAINT "event_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_refunds" ADD CONSTRAINT "gateway_refunds_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_refunds" ADD CONSTRAINT "gateway_refunds_gatewayOrderId_fkey" FOREIGN KEY ("gatewayOrderId") REFERENCES "gateway_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
