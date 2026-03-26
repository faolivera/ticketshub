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
  sellerPlatformFee: MoneySchema,
  buyerPlatformFee: MoneySchema,
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
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase letters, numbers, and hyphens only',
    )
    .optional(),
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
  isPopular: z.boolean().optional(),
  ticketApp: z.string().optional(),
  transferable: z.boolean().optional(),
  artists: z.array(z.string()).optional(),
  dates: z.array(AdminEventDateUpdateSchema).optional(),
  datesToDelete: z.array(z.string()).optional(),
});

const AdminEventResponseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string(),
  venue: z.string(),
  location: AdminEventAddressSchema,
  imageIds: z.array(z.string()),
  status: z.string(),
  isPopular: z.boolean(),
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
  hasRectangleBanner: z.boolean(),
  highlight: z.boolean(),
  squareBannerUrl: z.string().optional(),
  venue: z.string(),
  city: z.string(),
  dates: z.array(z.coerce.date()),
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
  eventSlug: z.string(),
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
  eventSlug: z.string(),
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
  pendingConfirmationTransactionIds: z.array(z.string()),
  pendingTransactionIds: z.array(z.string()),
});

export const AdminTransactionAuditLogActionSchema = z.enum([
  'created',
  'updated',
]);

export const AdminTransactionAuditLogEntrySchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  action: AdminTransactionAuditLogActionSchema,
  changedAt: z.coerce.date(),
  changedBy: z.string(),
  payload: z.any(),
});

export const AdminTransactionAuditLogsResponseSchema = z.object({
  transactionId: z.string(),
  total: z.number(),
  items: z.array(AdminTransactionAuditLogEntrySchema),
});

export const AdminTransactionChatMessageItemSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  senderRole: z.enum(['buyer', 'seller']),
  content: z.string(),
  messageType: z.enum(['text', 'delivery']),
  payloadType: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});

export const AdminTransactionChatMessagesResponseSchema = z.object({
  messages: z.array(AdminTransactionChatMessageItemSchema),
});

const AdminSellerPayoutTicketLineSchema = z.object({
  sectionName: z.string(),
  quantity: z.number(),
  unitPrice: MoneySchema,
  seatLabels: z.array(z.string()).optional(),
});

const AdminSellerPayoutItemSchema = z.object({
  transactionId: z.string(),
  eventName: z.string(),
  eventDate: z.coerce.date(),
  sellerId: z.string(),
  sellerName: z.string(),
  sellerEmail: z.string(),
  sellerVerified: z.boolean(),
  sellerReceives: MoneySchema,
  bankTransferDestination: z
    .object({
      holderName: z.string(),
      cbuOrCvu: z.string(),
      alias: z.string().optional(),
      bankName: z.string().optional(),
      cuitCuil: z.string().optional(),
    })
    .optional(),
  ticketLine: AdminSellerPayoutTicketLineSchema,
});

export const AdminSellerPayoutsResponseSchema = z.object({
  payouts: z.array(AdminSellerPayoutItemSchema),
});

export const AdminCompletePayoutResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
});

const AdminTransactionDetailPaymentConfirmationSchema =
  AdminTransactionPaymentConfirmationRefSchema.merge(
    z.object({
      transactionId: z.string(),
      uploadedBy: z.string(),
      contentType: z.string(),
    }),
  );

const BankTransferDestinationSchema = z.object({
  holderName: z.string(),
  cbuOrCvu: z.string(),
  alias: z.string().optional(),
  bankName: z.string().optional(),
  cuitCuil: z.string().optional(),
});

const AdminTransactionPayoutReceiptFileSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  uploadedBy: z.string(),
  uploadedAt: z.coerce.date(),
});

export const AdminTransactionDetailResponseSchema = z.object({
  id: z.string(),
  seller: AdminTransactionUserRefSchema,
  buyer: AdminTransactionUserRefSchema,
  status: z.string(),
  listing: AdminTransactionListingRefSchema,
  quantity: z.number(),
  ticketPrice: MoneySchema,
  buyerPlatformFee: MoneySchema,
  sellerPlatformFee: MoneySchema,
  paymentMethodCommission: MoneySchema,
  totalPaid: MoneySchema,
  sellerReceives: MoneySchema,
  paymentMethodId: z.string().optional(),
  paymentMethod: z
    .object({
      id: z.string(),
      type: z.string(),
      name: z.string(),
    })
    .optional(),
  appliedPromotion: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      config: z.record(z.string(), z.unknown()),
    })
    .optional(),
  createdAt: z.coerce.date(),
  paymentReceivedAt: z.coerce.date().optional(),
  ticketTransferredAt: z.coerce.date().optional(),
  buyerConfirmedAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  cancelledAt: z.coerce.date().optional(),
  refundedAt: z.coerce.date().optional(),
  paymentApprovedAt: z.coerce.date().optional(),
  paymentApprovedBy: z.string().optional(),
  disputeId: z.string().optional(),
  paymentConfirmations: z.array(
    AdminTransactionDetailPaymentConfirmationSchema,
  ),
  payoutReceiptFiles: z.array(AdminTransactionPayoutReceiptFileSchema),
  bankTransferDestination: BankTransferDestinationSchema.optional(),
});

/** Request body for PATCH /api/admin/transactions/:id - all fields optional */
export const AdminUpdateTransactionRequestSchema = z.object({
  status: z.string().optional(),
  quantity: z.number().int().min(0).optional(),
  ticketPrice: MoneySchema.optional(),
  buyerPlatformFee: MoneySchema.optional(),
  sellerPlatformFee: MoneySchema.optional(),
  paymentMethodCommission: MoneySchema.optional(),
  totalPaid: MoneySchema.optional(),
  sellerReceives: MoneySchema.optional(),
  paymentReceivedAt: z.string().nullable().optional(),
  ticketTransferredAt: z.string().nullable().optional(),
  buyerConfirmedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  refundedAt: z.string().nullable().optional(),
  paymentApprovedAt: z.string().nullable().optional(),
  paymentApprovedBy: z.string().nullable().optional(),
  disputeId: z.string().nullable().optional(),
  buyerId: z.string().optional(),
  sellerId: z.string().optional(),
  listingId: z.string().optional(),
  requiredActor: z.string().optional(),
  cancellationReason: z.string().nullable().optional(),
  cancelledBy: z.string().nullable().optional(),
});

export const AdminUserSearchItemSchema = z.object({
  id: z.string(),
  email: z.string(),
});

export const AdminUserSearchResponseSchema = z.array(AdminUserSearchItemSchema);

// ==================== Admin Dashboard Metrics ====================

const AdminDashboardMetricsUsersSchema = z.object({
  total: z.number(),
  phoneVerified: z.number(),
  dniVerified: z.number(),
  sellers: z.number(),
  verifiedSellers: z.number(),
});

const AdminDashboardMetricsEventsSchema = z.object({
  totalPublished: z.number(),
  totalActive: z.number(),
  eventsToday: z.number(),
  awaitingApproval: z.number(),
});

const AdminDashboardMetricsSupportTicketsSchema = z.object({
  totalOpen: z.number(),
  totalInProgress: z.number(),
  totalResolved: z.number(),
  total: z.number(),
});

const AdminDashboardMetricsPendingSchema = z.object({
  identityVerifications: z.number(),
  bankAccounts: z.number(),
  eventsAwaitingApproval: z.number(),
  buyerPaymentsPending: z.number(),
  sellerPayoutsPending: z.number(),
});

export const AdminDashboardMetricsResponseSchema = z.object({
  users: AdminDashboardMetricsUsersSchema,
  events: AdminDashboardMetricsEventsSchema,
  supportTickets: AdminDashboardMetricsSupportTicketsSchema,
  pending: AdminDashboardMetricsPendingSchema,
});

// ==================== Admin User Management ====================

export const AdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().optional(),
});

const AdminUserListItemSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  status: z.string(),
  role: z.string(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  identityVerificationStatus: z.enum([
    'none',
    'pending',
    'approved',
    'rejected',
  ]),
  bankAccountVerified: z.boolean(),
  acceptedSellerTermsAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
});

export const AdminUsersResponseSchema = z.object({
  users: z.array(AdminUserListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const AdminUserDetailIdentitySchema = z.object({
  status: z.string(),
  legalFirstName: z.string(),
  legalLastName: z.string(),
  dateOfBirth: z.string(),
  governmentIdNumber: z.string(),
  submittedAt: z.coerce.date(),
  reviewedAt: z.coerce.date().optional(),
  rejectionReason: z.string().optional(),
});

const AdminUserDetailBankAccountSchema = z.object({
  holderName: z.string(),
  cbuOrCvu: z.string(),
  verified: z.boolean(),
  verifiedAt: z.coerce.date().optional(),
});

export const AdminUserDetailResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  publicName: z.string(),
  role: z.string(),
  status: z.string(),
  phone: z.string().optional(),
  country: z.string(),
  currency: z.string(),
  language: z.string(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  tosAcceptedAt: z.coerce.date().optional(),
  acceptedSellerTermsAt: z.coerce.date().optional(),
  identityVerification: AdminUserDetailIdentitySchema.optional(),
  bankAccount: AdminUserDetailBankAccountSchema.optional(),
  buyerDisputed: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const AdminUpdateUserIdentityVerificationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  rejectionReason: z.string().max(500).optional(),
  reviewedAt: z.coerce.date().nullable().optional(),
});

const AdminUpdateUserBankAccountSchema = z.object({
  holderName: z.string().min(1).max(120).optional(),
  cbuOrCvu: z.string().max(30).optional(),
  alias: z.string().max(50).optional(),
  verified: z.boolean().optional(),
  verifiedAt: z.coerce.date().nullable().optional(),
});

export const AdminUpdateUserRequestSchema = z.object({
  firstName: z.string().min(1).max(120).optional(),
  lastName: z.string().min(1).max(120).optional(),
  publicName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional(),
  role: z.enum(['User', 'Admin']).optional(),
  status: z.enum(['Enabled', 'Disabled', 'Suspended']).optional(),
  phone: z.string().max(30).optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
  country: z.string().min(1).max(100).optional(),
  currency: z.string().min(3).max(3).optional(),
  language: z.enum(['es', 'en']).optional(),
  tosAcceptedAt: z.coerce.date().nullable().optional(),
  acceptedSellerTermsAt: z.coerce.date().nullable().optional(),
  buyerDisputed: z.boolean().optional(),
  identityVerification: AdminUpdateUserIdentityVerificationSchema.optional(),
  bankAccount: AdminUpdateUserBankAccountSchema.optional(),
});

export const AdminUpdateUserResponseSchema = AdminUserDetailResponseSchema;

// ==================== Admin Support Tickets ====================

const AdminSupportTicketItemSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  transactionId: z.string().optional(),
  category: z.string(),
  source: z.string().optional(),
  subject: z.string(),
  description: z.string(),
  guestName: z.string().optional(),
  guestEmail: z.string().optional(),
  guestId: z.string().optional(),
  initiatorName: z.string().optional(),
  initiatorEmail: z.string().optional(),
  status: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  resolution: z.string().optional(),
  resolutionNotes: z.string().optional(),
  resolvedBy: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  resolvedAt: z.coerce.date().optional(),
});

export const AdminSupportTicketsResponseSchema = z.object({
  tickets: z.array(AdminSupportTicketItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

const AdminSupportMessageItemSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  userId: z.string(),
  isAdmin: z.boolean(),
  message: z.string(),
  attachmentUrls: z.array(z.string()).optional(),
  createdAt: z.coerce.date(),
});

const AdminSupportTicketTransactionSummarySchema = z.object({
  initiatorRole: z.enum(['buyer', 'seller']).optional(),
  status: z.string(),
  ticketPrice: MoneySchema,
  quantity: z.number(),
  totalPaid: MoneySchema,
  sellerReceives: MoneySchema,
});

export const AdminSupportTicketDetailResponseSchema =
  AdminSupportTicketItemSchema.merge(
    z.object({
      messages: z.array(AdminSupportMessageItemSchema),
      transactionSummary: AdminSupportTicketTransactionSummarySchema.optional(),
    }),
  );

export const AdminUpdateSupportTicketStatusResponseSchema =
  AdminSupportTicketItemSchema;

export const AdminResolveSupportDisputeResponseSchema =
  AdminSupportTicketItemSchema;

export const AdminAddSupportTicketMessageResponseSchema = z.object({
  success: z.boolean(),
  messageId: z.string(),
});

// ==================== Admin Import Events ====================

const ImportEventAddressSchema = z.object({
  line1: z.string().min(1, 'line1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'city is required'),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string().min(2).max(3, 'countryCode must be 2-3 characters'),
});

const ImportEventSectionItemSchema = z.object({
  name: z.string().min(1, 'section name is required'),
  seatingType: z.enum(['numbered', 'unnumbered']),
});

const ImportEventCategorySchema = z.enum([
  'Concert',
  'Sports',
  'Theater',
  'Festival',
  'Conference',
  'Comedy',
  'Other',
]);

const isoDatetimeSchema = z.string().refine(
  (val) => {
    const parsed = Date.parse(val);
    return !Number.isNaN(parsed);
  },
  { message: 'Must be a valid ISO 8601 date-time string' },
);

export const ImportEventItemSchema = z
  .object({
    name: z.string().min(1, 'name is required').max(200),
    category: ImportEventCategorySchema,
    venue: z.string().min(1, 'venue is required').max(200),
    location: ImportEventAddressSchema,
    dates: z.array(isoDatetimeSchema).min(1, 'At least one date is required'),
    sections: z.array(ImportEventSectionItemSchema).optional(),
    sourceCode: z.string().min(1, 'sourceCode is required').max(100),
    sourceId: z.string().min(1, 'sourceId is required').max(200),
    imageSquareBase64: z.string().optional(),
    imageRectangleBase64: z.string().optional(),
    imageOGBase64: z.string().optional(),
    slug: z
      .string()
      .min(2, 'slug must be at least 2 characters')
      .max(120, 'slug must be at most 120 characters')
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        'Slug must be lowercase letters, numbers, and hyphens only',
      )
      .optional(),
    ticketApp: z.string().optional(),
    transferable: z.boolean().optional(),
    artists: z.array(z.string()).optional(),
    popular: z.boolean().optional(),
    isManualCreation: z.boolean().optional(),
  })
  .refine(
    (data) => {
      const sections = data.sections ?? [];
      if (sections.length === 0) return true;
      const names = sections.map((s) => s.name.toLowerCase());
      return new Set(names).size === names.length;
    },
    { message: 'Section names must be unique per event', path: ['sections'] },
  )
  .superRefine((val, ctx) => {
    if (val.transferable !== undefined && !val.ticketApp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transferable'],
        message: 'transferable requires ticketApp to be present',
      });
    }
  });

export const ImportEventsPayloadSchema = z.object({
  events: z.array(ImportEventItemSchema).min(1, 'At least one event is required'),
});

export const ImportEventsPreviewItemSchema = z.object({
  index: z.number(),
  name: z.string(),
  category: ImportEventCategorySchema,
  venue: z.string(),
  location: ImportEventAddressSchema,
  slug: z.string(),
  datesCount: z.number(),
  dateLabels: z.array(z.string()),
  sections: z.array(ImportEventSectionItemSchema).optional(),
  sourceCode: z.string(),
  sourceId: z.string(),
  ticketApp: z.string().optional(),
  transferable: z.boolean().optional(),
  artists: z.array(z.string()).optional(),
  isPopular: z.boolean().optional(),
});

export const ImportEventsPreviewResponseSchema = z.object({
  events: z.array(ImportEventsPreviewItemSchema),
  eventsForImport: z.array(ImportEventItemSchema),
});

export const ImportEventResultItemSchema = z.object({
  index: z.number(),
  success: z.boolean(),
  eventId: z.string().optional(),
  slug: z.string().optional(),
  name: z.string().optional(),
  error: z.string().optional(),
});

export const ImportEventsResultResponseSchema = z.object({
  total: z.number(),
  created: z.number(),
  failed: z.number(),
  results: z.array(ImportEventResultItemSchema),
});

// ----- Events ranking config -----

export const AdminGetEventsRankingConfigResponseSchema = z.object({
  weightActiveListings: z.number(),
  weightTransactions: z.number(),
  weightProximity: z.number(),
  weightPopular: z.number(),
  jobIntervalMinutes: z.number(),
  lastRunAt: z.string().nullable(),
  updatedAt: z.string(),
});

export const AdminPatchEventsRankingConfigRequestSchema = z.object({
  weightActiveListings: z.number().min(0).optional(),
  weightTransactions: z.number().min(0).optional(),
  weightProximity: z.number().min(0).optional(),
  weightPopular: z.number().min(0).optional(),
  jobIntervalMinutes: z.number().int().min(1).max(1440).optional(),
});

export const AdminPostEventsRankingQueueRequestSchema = z.object({
  eventIds: z.array(z.string().min(1)).min(1).max(500),
});

export const AdminPostEventsRankingQueueResponseSchema = z.object({
  enqueued: z.number(),
});

// ----- Featured events -----

export const AdminSetFeaturedEventRequestSchema = z.object({
  highlighted: z.boolean(),
});

export const AdminSetFeaturedEventResponseSchema = z.object({
  eventId: z.string(),
  highlighted: z.boolean(),
});
