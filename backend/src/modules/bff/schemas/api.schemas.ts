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

const TicketTypeSchema = z.enum([
  'Physical',
  'DigitalTransferable',
  'DigitalNonTransferable',
]);
const DeliveryMethodSchema = z.enum(['Pickup', 'ArrangeWithSeller']);
const TransactionStatusSchema = z.enum([
  'PendingPayment',
  'PaymentReceived',
  'TicketTransferred',
  'Completed',
  'Disputed',
  'Refunded',
  'Cancelled',
]);
const ListingStatusSchema = z.enum(['Active', 'Sold', 'Cancelled', 'Expired']);
const TicketUnitStatusSchema = z.enum(['available', 'reserved', 'sold']);
const SeatingTypeSchema = z.enum(['numbered', 'unnumbered']);

const TicketSeatSchema = z.object({
  row: z.string(),
  seatNumber: z.string(),
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
  pic: ImageSchema,
  memberSince: z.string(),
  totalSales: z.number(),
  reviewStats: SellerReviewStatsSchema,
  reviews: z.array(SellerReviewSchema),
});

export const GetSellerProfileResponseSchema = SellerProfileSchema;

const CommissionPercentRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
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
  description: z.string().optional(),
  eventSectionId: z.string(),
  status: ListingStatusSchema,
  expiresAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  eventName: z.string(),
  eventDate: z.coerce.date(),
  venue: z.string(),
  sectionName: z.string(),
  sellerPublicName: z.string(),
  sellerPic: ImageSchema,
  commissionPercentRange: CommissionPercentRangeSchema,
});

export const GetEventListingsResponseSchema = z.array(ListingWithSellerSchema);

const TransactionWithDetailsSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  buyerId: z.string(),
  sellerId: z.string(),
  ticketType: TicketTypeSchema,
  ticketUnitIds: z.array(z.string()),
  quantity: z.number(),
  ticketPrice: MoneySchema,
  buyerFee: MoneySchema,
  sellerFee: MoneySchema,
  totalPaid: MoneySchema,
  sellerReceives: MoneySchema,
  status: TransactionStatusSchema,
  createdAt: z.coerce.date(),
  paymentReceivedAt: z.coerce.date().optional(),
  ticketTransferredAt: z.coerce.date().optional(),
  buyerConfirmedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  cancelledAt: z.coerce.date().optional(),
  refundedAt: z.coerce.date().optional(),
  eventDateTime: z.coerce.date().optional(),
  releaseAfterMinutes: z.number().optional(),
  autoReleaseAt: z.coerce.date().optional(),
  deliveryMethod: DeliveryMethodSchema.optional(),
  pickupAddress: AddressSchema.optional(),
  disputeId: z.string().optional(),
  updatedAt: z.coerce.date(),
  eventName: z.string(),
  eventDate: z.coerce.date(),
  venue: z.string(),
  buyerName: z.string(),
  sellerName: z.string(),
});

const TicketListingWithEventSchema = ListingWithSellerSchema.omit({
  sellerPublicName: true,
  sellerPic: true,
  commissionPercentRange: true,
});

export const GetMyTicketsResponseSchema = z.object({
  bought: z.array(TransactionWithDetailsSchema),
  sold: z.array(TransactionWithDetailsSchema),
  listed: z.array(TicketListingWithEventSchema),
});

const PaymentMethodTypeSchema = z.enum(['payment_gateway', 'manual_approval']);

const BankTransferConfigSchema = z
  .object({
    cbu: z.string(),
    accountHolderName: z.string(),
    bankName: z.string(),
    cuitCuil: z.string(),
  })
  .optional();

const PublicPaymentMethodOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: PaymentMethodTypeSchema,
  buyerCommissionPercent: z.number().nullable(),
  bankTransferConfig: BankTransferConfigSchema,
});

const BuyPageSellerInfoSchema = z.object({
  id: z.string(),
  publicName: z.string(),
  pic: ImageSchema,
  badges: z.array(z.string()),
  totalSales: z.number(),
  percentPositiveReviews: z.number().nullable(),
  totalReviews: z.number(),
});

export const GetBuyPageResponseSchema = z.object({
  listing: TicketListingWithEventSchema,
  seller: BuyPageSellerInfoSchema,
  paymentMethods: z.array(PublicPaymentMethodOptionSchema),
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

export const GetTransactionDetailsResponseSchema = z.object({
  transaction: TransactionWithDetailsSchema,
  paymentConfirmation: PaymentConfirmationSchema.nullable(),
  reviews: TransactionReviewsDataSchema.nullable(),
});
