import { z } from 'zod';

const MoneySchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

export const AdminPaymentItemSchema = z.object({
  // Payment confirmation data
  id: z.string(),
  transactionId: z.string(),
  uploadedBy: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  status: z.string(),
  createdAt: z.coerce.date(),
  reviewedAt: z.coerce.date().optional(),
  adminNotes: z.string().optional(),

  // Transaction enrichment
  buyerName: z.string(),
  sellerName: z.string(),
  eventName: z.string(),
  transactionAmount: z.number(),
  transactionCurrency: z.string(),

  // Additional transaction details
  listingId: z.string(),
  quantity: z.number(),
  pricePerUnit: MoneySchema,
  sellerFee: MoneySchema,
  buyerFee: MoneySchema,
});

export const AdminPaymentsResponseSchema = z.object({
  payments: z.array(AdminPaymentItemSchema),
  total: z.number(),
});

export const AdminPendingEventDateItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  date: z.coerce.date(),
  status: z.string(),
  pendingListingsCount: z.number(),
  createdAt: z.coerce.date(),
});

export const AdminPendingSectionItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  name: z.string(),
  seatingType: z.enum(['numbered', 'unnumbered']),
  status: z.string(),
  pendingListingsCount: z.number(),
  createdAt: z.coerce.date(),
});

export const AdminPendingEventItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  venue: z.string(),
  category: z.string(),
  status: z.string(),
  createdAt: z.coerce.date(),
  pendingDates: z.array(AdminPendingEventDateItemSchema),
  pendingSections: z.array(AdminPendingSectionItemSchema),
  pendingListingsCount: z.number(),
});

export const AdminPendingEventsResponseSchema = z.object({
  events: z.array(AdminPendingEventItemSchema),
  total: z.number(),
});

export const AdminApproveSectionRequestSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export const AdminApproveSectionResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  seatingType: z.enum(['numbered', 'unnumbered']),
  status: z.string(),
  approvedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// Admin Event Update Schemas

const AdminEventAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string().min(2).max(3),
});

const AdminEventDateUpdateSchema = z.object({
  id: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO datetime string',
  }),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
});

export const AdminUpdateEventRequestSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: z
    .enum([
      'Concert',
      'Sports',
      'Theater',
      'Festival',
      'Conference',
      'Comedy',
      'Other',
    ])
    .optional(),
  venue: z.string().min(2).max(200).optional(),
  location: AdminEventAddressSchema.optional(),
  imageIds: z.array(z.string()).optional(),
  dates: z.array(AdminEventDateUpdateSchema).optional(),
  datesToDelete: z.array(z.string()).optional(),
});

const AdminEventResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  venue: z.string(),
  location: AdminEventAddressSchema,
  imageIds: z.array(z.string()),
  status: z.string(),
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const AdminEventDateResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  date: z.coerce.date(),
  status: z.string(),
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const AdminUpdateEventResponseSchema = z.object({
  event: AdminEventResponseSchema,
  dates: z.array(AdminEventDateResponseSchema),
  deletedDateIds: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
});

export const AdminAddSectionRequestSchema = z.object({
  name: z.string().min(1).max(200),
  seatingType: z.enum(['numbered', 'unnumbered']),
});

export const AdminAddSectionResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  seatingType: z.enum(['numbered', 'unnumbered']),
  status: z.string(),
  createdBy: z.string(),
  approvedBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const AdminDeleteSectionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const AdminUpdateSectionRequestSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    seatingType: z.enum(['numbered', 'unnumbered']).optional(),
  })
  .refine((data) => data.name !== undefined || data.seatingType !== undefined, {
    message: 'At least one of name or seatingType must be provided',
  });

export const AdminUpdateSectionResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  seatingType: z.enum(['numbered', 'unnumbered']),
  status: z.string(),
  approvedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
  updatedAt: z.coerce.date(),
});

// Admin All Events Schemas

export const AdminAllEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
});

export const AdminEventCreatorInfoSchema = z.object({
  id: z.string(),
  publicName: z.string(),
});

export const AdminAllEventItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  createdAt: z.coerce.date(),
  createdBy: AdminEventCreatorInfoSchema,
  listingsCount: z.number(),
  availableTicketsCount: z.number(),
});

export const AdminAllEventsResponseSchema = z.object({
  events: z.array(AdminAllEventItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// Admin Event Listings Schemas

export const AdminTicketStatusCountsSchema = z.object({
  available: z.number(),
  reserved: z.number(),
  sold: z.number(),
});

export const AdminListingEventDateSchema = z.object({
  id: z.string(),
  date: z.coerce.date(),
});

export const AdminListingEventSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const AdminListingCreatorInfoSchema = z.object({
  id: z.string(),
  publicName: z.string(),
});

export const AdminEventListingItemSchema = z.object({
  id: z.string(),
  createdBy: AdminListingCreatorInfoSchema,
  eventDate: AdminListingEventDateSchema,
  eventSection: AdminListingEventSectionSchema,
  totalTickets: z.number(),
  ticketsByStatus: AdminTicketStatusCountsSchema,
  status: z.string(),
  pricePerTicket: MoneySchema,
  createdAt: z.coerce.date(),
});

export const AdminEventListingsResponseSchema = z.object({
  listings: z.array(AdminEventListingItemSchema),
  total: z.number(),
});

// Admin Transactions Schemas

export const AdminTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(20).optional().default(20),
  search: z.string().optional(),
});

const AdminTransactionUserRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

const AdminTransactionListingRefSchema = z.object({
  id: z.string(),
  eventName: z.string(),
  eventDate: z.coerce.date(),
  sectionName: z.string(),
  quantity: z.number(),
  pricePerTicket: MoneySchema,
});

const AdminTransactionPaymentConfirmationRefSchema = z.object({
  id: z.string(),
  status: z.string(),
  originalFilename: z.string(),
  createdAt: z.coerce.date(),
  reviewedAt: z.coerce.date().optional(),
  adminNotes: z.string().optional(),
});

export const AdminTransactionListItemSchema = z.object({
  id: z.string(),
  seller: AdminTransactionUserRefSchema,
  buyer: AdminTransactionUserRefSchema,
  status: z.string(),
  listing: AdminTransactionListingRefSchema,
  totalPaid: MoneySchema,
  createdAt: z.coerce.date(),
  paymentConfirmation: AdminTransactionPaymentConfirmationRefSchema.optional(),
});

export const AdminTransactionsResponseSchema = z.object({
  transactions: z.array(AdminTransactionListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const AdminTransactionsPendingSummaryResponseSchema = z.object({
  pendingConfirmationsCount: z.number(),
  pendingTransactionsCount: z.number(),
});

const AdminTransactionDetailPaymentConfirmationSchema =
  AdminTransactionPaymentConfirmationRefSchema.merge(
    z.object({
      transactionId: z.string(),
      uploadedBy: z.string(),
      contentType: z.string(),
    }),
  );

export const AdminTransactionDetailResponseSchema = z.object({
  id: z.string(),
  seller: AdminTransactionUserRefSchema,
  buyer: AdminTransactionUserRefSchema,
  status: z.string(),
  listing: AdminTransactionListingRefSchema,
  quantity: z.number(),
  ticketPrice: MoneySchema,
  buyerFee: MoneySchema,
  sellerFee: MoneySchema,
  totalPaid: MoneySchema,
  sellerReceives: MoneySchema,
  createdAt: z.coerce.date(),
  paymentReceivedAt: z.coerce.date().optional(),
  ticketTransferredAt: z.coerce.date().optional(),
  buyerConfirmedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  paymentConfirmations: z.array(AdminTransactionDetailPaymentConfirmationSchema),
});
