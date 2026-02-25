import { z } from 'zod';
import { ImageSchema, AddressSchema, CurrencyCodeSchema } from '../../users/schemas/api.schemas';

const MoneySchema = z.object({
  amount: z.number(),
  currency: CurrencyCodeSchema,
});

const TicketTypeSchema = z.enum(['Physical', 'DigitalTransferable', 'DigitalNonTransferable']);
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

export const SellerReviewTypeSchema = z.enum(['positive', 'neutral', 'negative']);

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
  section: z.string().optional(),
  status: ListingStatusSchema,
  expiresAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  eventName: z.string(),
  eventDate: z.coerce.date(),
  venue: z.string(),
  sellerPublicName: z.string(),
  sellerPic: ImageSchema,
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
});

export const GetMyTicketsResponseSchema = z.object({
  bought: z.array(TransactionWithDetailsSchema),
  sold: z.array(TransactionWithDetailsSchema),
  listed: z.array(TicketListingWithEventSchema),
});

const PaymentMethodIdSchema = z.enum(['payway', 'mercadopago', 'uala_bis_debito', 'bank_transfer']);
const PaymentMethodTypeSchema = z.enum(['webhook_integrated', 'manual_approval']);
const PaymentMethodOptionSchema = z.object({
  id: PaymentMethodIdSchema,
  name: z.string(),
  commissionPercent: z.number().nullable(),
  type: PaymentMethodTypeSchema,
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
  paymentMethods: z.array(PaymentMethodOptionSchema),
});
