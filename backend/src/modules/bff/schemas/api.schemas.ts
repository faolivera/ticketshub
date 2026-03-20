import { z } from 'zod';
import {
  ImageSchema,
  AddressSchema,
  CurrencyCodeSchema,
} from '../../users/schemas/api.schemas';

const MoneySchema = z.object({
  amount: z.number(),
  currency: CurrencyCodeSchema,
});

const BankTransferConfigSchema = z.object({
  cbu: z.string(),
  accountHolderName: z.string(),
  bankName: z.string(),
  cuitCuil: z.string(),
});

const TicketTypeSchema = z.enum(['Physical', 'Digital']);
const DeliveryMethodSchema = z.enum(['Pickup', 'ArrangeWithSeller']);
const TransactionStatusSchema = z.enum([
  'PendingPayment',
  'PaymentPendingVerification',
  'PaymentReceived',
  'TicketTransferred',
  'DepositHold',
  'TransferringFund',
  'Completed',
  'Disputed',
  'Refunded',
  'Cancelled',
]);

const RequiredActorSchema = z.enum(['Buyer', 'Seller', 'Platform', 'None']);
const ListingStatusSchema = z.enum(['Active', 'Sold', 'Cancelled', 'Expired']);
const TicketUnitStatusSchema = z.enum(['available', 'reserved', 'sold']);
const SeatingTypeSchema = z.enum(['numbered', 'unnumbered']);

const TicketSeatSchema = z.object({
  row: z.string(),
  seatNumber: z.string(),
});

const BannerUrlsSchema = z.object({
  square: z.string().optional(),
  rectangle: z.string().optional(),
  og_image: z.string().optional(),
});

const TicketUnitSchema = z.object({
  id: z.string(),
  status: TicketUnitStatusSchema,
  seat: TicketSeatSchema.optional(),
});

export const SellerReviewTypeSchema = z.enum([
  'positive',
  'neutral',
  'negative',
]);

export const SellerReviewSchema = z.object({
  id: z.string(),
  buyerName: z.string(),
  type: SellerReviewTypeSchema,
  comment: z.string(),
  eventName: z.string(),
  ticketType: z.string(),
  eventDate: z.string(),
  reviewDate: z.string(),
});

export const SellerReviewStatsSchema = z.object({
  positive: z.number(),
  neutral: z.number(),
  negative: z.number(),
});

export const SellerProfileSchema = z.object({
  id: z.string(),
  publicName: z.string(),
  pic: ImageSchema.nullable(),
  memberSince: z.string(),
  totalSales: z.number(),
  reviewStats: SellerReviewStatsSchema,
  reviews: z.array(SellerReviewSchema),
});

export const GetSellerProfileResponseSchema = SellerProfileSchema;

const ActivePromotionSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  config: z.object({ feePercentage: z.number() }),
  promoLabel: z.string(),
});

export const GetSellTicketConfigResponseSchema = z.object({
  sellerPlatformFeePercentage: z.number(),
  activePromotion: ActivePromotionSummarySchema.optional(),
});

const CommissionPercentRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

const SellerReputationSchema = z.object({
  totalSales: z.number(),
  totalReviews: z.number(),
  positivePercent: z.number().nullable(),
  badges: z.array(z.string()),
});

export const ListingWithSellerSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  eventId: z.string(),
  eventDateId: z.string(),
  type: TicketTypeSchema,
  seatingType: SeatingTypeSchema,
  ticketUnits: z.array(TicketUnitSchema),
  sellTogether: z.boolean(),
  pricePerTicket: MoneySchema,
  deliveryMethod: DeliveryMethodSchema.optional(),
  pickupAddress: AddressSchema.optional(),
  eventSectionId: z.string(),
  status: ListingStatusSchema,
  expiresAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  eventName: z.string(),
  eventSlug: z.string(),
  eventDate: z.coerce.date(),
  venue: z.string(),
  city: z.string().optional(),
  sectionName: z.string(),
  bannerUrls: BannerUrlsSchema.optional(),
  sellerPublicName: z.string(),
  sellerPic: ImageSchema.nullable(),
  commissionPercentRange: CommissionPercentRangeSchema,
  sellerReputation: SellerReputationSchema,
});

export const GetEventListingsResponseSchema = z.array(ListingWithSellerSchema);

export const GetEventPageResponseSchema = z.object({
  event: z.any(),
  listings: GetEventListingsResponseSchema,
});

/** BFF transaction view: servicePrice instead of buyerPlatformFee + paymentMethodCommission */
const BffTransactionWithDetailsSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  ticketType: TicketTypeSchema,
  ticketUnitIds: z.array(z.string()),
  quantity: z.number(),
  ticketPrice: MoneySchema,
  servicePrice: MoneySchema,
  sellerPlatformFee: MoneySchema,
  totalPaid: MoneySchema,
  sellerReceives: MoneySchema,
  pricingSnapshotId: z.string(),
  offerId: z.string().optional(),
  status: TransactionStatusSchema,
  requiredActor: RequiredActorSchema,
  createdAt: z.coerce.date(),
  paymentReceivedAt: z.coerce.date().optional(),
  ticketTransferredAt: z.coerce.date().optional(),
  sellerSentPayloadType: z
    .enum(['ticketera', 'pdf_or_image', 'other'])
    .optional(),
  sellerSentPayloadTypeOtherText: z.string().optional(),
  buyerConfirmedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  cancelledAt: z.coerce.date().optional(),
  cancelledBy: z.string().optional(),
  cancellationReason: z.string().optional(),
  paymentExpiresAt: z.coerce.date(),
  adminReviewExpiresAt: z.coerce.date().optional(),
  refundedAt: z.coerce.date().optional(),
  depositReleaseAt: z.coerce.date().optional(),
  deliveryMethod: DeliveryMethodSchema.optional(),
  pickupAddress: AddressSchema.optional(),
  disputeId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  paymentConfirmationId: z.string().optional(),
  paymentApprovedBy: z.string().optional(),
  paymentApprovedAt: z.coerce.date().optional(),
  transferProofStorageKey: z.string().optional(),
  transferProofOriginalFilename: z.string().optional(),
  receiptProofStorageKey: z.string().optional(),
  receiptProofOriginalFilename: z.string().optional(),
  updatedAt: z.coerce.date(),
  version: z.number(),
  eventName: z.string(),
  eventDate: z.coerce.date(),
  venue: z.string(),
  buyerName: z.string(),
  sellerName: z.string(),
  buyerPic: z.string().nullable(),
  sellerPic: z.string().nullable(),
  sectionName: z.string(),
  bannerUrls: BannerUrlsSchema.optional(),
});

const TicketListingWithEventSchema = ListingWithSellerSchema.omit({
  sellerPublicName: true,
  sellerPic: true,
  commissionPercentRange: true,
});

export const GetMyTicketsResponseSchema = z.object({
  bought: z.array(BffTransactionWithDetailsSchema),
  sold: z.array(BffTransactionWithDetailsSchema),
  listed: z.array(TicketListingWithEventSchema),
});

const BuyPagePaymentMethodOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  serviceFeePercent: z.number(),
});

const BuyPagePricingSnapshotSchema = z.object({
  id: z.string(),
  expiresAt: z.coerce.date(),
});

const BuyPageSellerInfoSchema = z.object({
  id: z.string(),
  publicName: z.string(),
  pic: ImageSchema.nullable(),
  badges: z.array(z.string()),
  totalSales: z.number(),
  percentPositiveReviews: z.number().nullable(),
  totalReviews: z.number(),
});

const CheckoutRiskSchema = z.object({
  requireV1: z.boolean(),
  requireV2: z.boolean(),
  requireV3: z.boolean(),
  missingV1: z.boolean(),
  missingV2: z.boolean(),
  missingV3: z.boolean(),
});

export const GetBuyPageResponseSchema = z.object({
  listing: TicketListingWithEventSchema,
  seller: BuyPageSellerInfoSchema,
  paymentMethods: z.array(BuyPagePaymentMethodOptionSchema),
  pricingSnapshot: BuyPagePricingSnapshotSchema,
  checkoutRisk: CheckoutRiskSchema.optional(),
});

export const GetCheckoutRiskResponseSchema = z.object({
  checkoutRisk: CheckoutRiskSchema,
});

const PaymentConfirmationStatusSchema = z.enum([
  'Pending',
  'Accepted',
  'Rejected',
]);

const PaymentConfirmationSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  uploadedBy: z.string(),
  storageKey: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  status: PaymentConfirmationStatusSchema,
  adminNotes: z.string().optional(),
  reviewedBy: z.string().optional(),
  createdAt: z.coerce.date(),
  reviewedAt: z.coerce.date().optional(),
});

const ReviewRatingSchema = z.enum(['positive', 'negative', 'neutral']);
const ReviewPartyRoleSchema = z.enum(['buyer', 'seller']);

const ReviewSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  reviewerId: z.string(),
  reviewerRole: ReviewPartyRoleSchema,
  revieweeId: z.string(),
  revieweeRole: ReviewPartyRoleSchema,
  rating: ReviewRatingSchema,
  comment: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const TransactionReviewsDataSchema = z.object({
  buyerReview: ReviewSchema.nullable(),
  sellerReview: ReviewSchema.nullable(),
  canReview: z.boolean(),
});

const TransactionTicketUnitSchema = z.object({
  id: z.string(),
  seat: TicketSeatSchema.optional(),
});

const TransactionDetailsChatConfigSchema = z.object({
  chatMode: z.enum(['enabled', 'only_read']),
  chatPollIntervalSeconds: z.number(),
  chatMaxMessages: z.number(),
  hasUnreadMessages: z.boolean(),
  hasExchangedMessages: z.boolean(),
});

export const GetTransactionDetailsResponseSchema = z.object({
  transaction: BffTransactionWithDetailsSchema,
  paymentConfirmation: PaymentConfirmationSchema.nullable(),
  reviews: TransactionReviewsDataSchema.nullable(),
  bankTransferConfig: BankTransferConfigSchema.nullable(),
  ticketUnits: z.array(TransactionTicketUnitSchema),
  paymentMethodPublicName: z.string().nullable(),
  chat: TransactionDetailsChatConfigSchema.optional(),
  counterpartyEmail: z.string().optional(),
});

export const ValidateSellListingResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('can_create') }),
  z.object({ status: z.literal('date_proximity_restriction') }),
  z.object({ status: z.literal('listing_limits_restriction') }),
]);

export const GetActivityHistoryResponseSchema = z.object({
  items: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('transaction'),
        transaction: BffTransactionWithDetailsSchema,
      }),
      z.object({ type: z.literal('offer'), offer: z.any() }),
    ]),
  ),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});
