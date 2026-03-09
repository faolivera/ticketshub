/**
 * Admin BFF API types
 */

/**
 * Money representation
 */
export interface Money {
  amount: number; // in cents
  currency: string;
}

/**
 * Enriched payment item for admin payments list
 */
export interface AdminPaymentItem {
  // Payment confirmation data
  id: string;
  transactionId: string;
  uploadedBy: string;
  originalFilename: string;
  contentType: string;
  status: string;
  createdAt: Date;
  reviewedAt?: Date;
  adminNotes?: string;

  // Transaction enrichment (from PaymentConfirmationWithTransaction)
  buyerName: string;
  sellerName: string;
  eventName: string;
  transactionAmount: number;
  transactionCurrency: string;

  // Additional transaction details
  listingId: string;
  quantity: number;
  pricePerUnit: Money;
  sellerPlatformFee: Money;
  buyerPlatformFee: Money;
}

/**
 * Response for GET /api/admin/payments
 */
export interface AdminPaymentsResponse {
  payments: AdminPaymentItem[];
  total: number;
}

/**
 * Pending event date item for admin
 */
export interface AdminPendingEventDateItem {
  id: string;
  eventId: string;
  eventName: string;
  date: Date;
  status: string;
  pendingListingsCount: number;
  createdAt: Date;
}

/**
 * Pending event section item for admin
 */
export interface AdminPendingSectionItem {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  seatingType: 'numbered' | 'unnumbered';
  status: string;
  pendingListingsCount: number;
  createdAt: Date;
}

/**
 * Pending event item for admin
 */
export interface AdminPendingEventItem {
  id: string;
  name: string;
  venue: string;
  category: string;
  status: string;
  createdAt: Date;
  pendingDates: AdminPendingEventDateItem[];
  pendingSections: AdminPendingSectionItem[];
  pendingListingsCount: number;
}

/**
 * Request for PATCH /api/admin/events/sections/:id
 */
export interface AdminApproveSectionRequest {
  approved: boolean;
  rejectionReason?: string;
}

/**
 * Response for PATCH /api/admin/events/sections/:id
 */
export interface AdminApproveSectionResponse {
  id: string;
  eventId: string;
  name: string;
  seatingType: 'numbered' | 'unnumbered';
  status: string;
  approvedBy?: string;
  rejectionReason?: string;
}

/**
 * Response for GET /api/admin/events/pending
 */
export interface AdminPendingEventsResponse {
  events: AdminPendingEventItem[];
  total: number;
}

/**
 * Address structure for event location
 */
export interface AdminEventAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
}

/**
 * Event date update for admin editing
 */
export interface AdminEventDateUpdate {
  id?: string; // If provided, update existing. If omitted, create new
  date: string; // ISO datetime string (day+time), normalized to minute precision
  status?: string; // Admin can set status directly
}

/**
 * Request for PATCH /api/admin/events/:id
 */
export interface AdminUpdateEventRequest {
  name?: string;
  slug?: string; // Only admin can set/edit; used in /event/{slug} URL
  category?: string;
  venue?: string;
  location?: AdminEventAddress;
  imageIds?: string[];
  dates?: AdminEventDateUpdate[];
  datesToDelete?: string[]; // IDs of dates to remove
}

/**
 * Response for PATCH /api/admin/events/:id
 */
export interface AdminUpdateEventResponse {
  event: {
    id: string;
    slug: string;
    name: string;
    category: string;
    venue: string;
    location: AdminEventAddress;
    imageIds: string[];
    status: string;
    createdBy: string;
    approvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
  };
  dates: {
    id: string;
    eventId: string;
    date: Date;
    status: string;
    createdBy: string;
    approvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  deletedDateIds: string[];
  warnings?: string[];
}

/**
 * Request for POST /api/admin/events/:eventId/sections
 */
export interface AdminAddSectionRequest {
  name: string;
  seatingType: 'numbered' | 'unnumbered';
}

/**
 * Response for POST /api/admin/events/:eventId/sections
 */
export interface AdminAddSectionResponse {
  id: string;
  eventId: string;
  name: string;
  seatingType: 'numbered' | 'unnumbered';
  status: string;
  createdBy: string;
  approvedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Response for DELETE /api/admin/events/sections/:id
 */
export interface AdminDeleteSectionResponse {
  success: boolean;
  message: string;
}

/**
 * Request for PUT /api/admin/events/sections/:id (update section name and seating type)
 */
export interface AdminUpdateSectionRequest {
  name?: string;
  seatingType?: 'numbered' | 'unnumbered';
}

/**
 * Response for PUT /api/admin/events/sections/:id
 */
export interface AdminUpdateSectionResponse {
  id: string;
  eventId: string;
  name: string;
  seatingType: 'numbered' | 'unnumbered';
  status: string;
  approvedBy?: string;
  rejectionReason?: string;
  updatedAt: Date;
}

/**
 * Query parameters for GET /api/admin/events/all
 */
export interface AdminAllEventsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Creator info for admin all events list
 */
export interface AdminEventCreatorInfo {
  id: string;
  publicName: string;
}

/**
 * Event item for admin all events list
 */
export interface AdminAllEventItem {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
  createdBy: AdminEventCreatorInfo;
  listingsCount: number;
  availableTicketsCount: number;
}

/**
 * Response for GET /api/admin/events/all
 */
export interface AdminAllEventsResponse {
  events: AdminAllEventItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Ticket status counts for admin listing view
 */
export interface AdminTicketStatusCounts {
  available: number;
  reserved: number;
  sold: number;
}

/**
 * Event date reference for listing
 */
export interface AdminListingEventDate {
  id: string;
  date: Date;
}

/**
 * Event section reference for listing
 */
export interface AdminListingEventSection {
  id: string;
  name: string;
}

/**
 * Creator info for listing
 */
export interface AdminListingCreatorInfo {
  id: string;
  publicName: string;
}

/**
 * Ticket listing item for admin event listings view
 */
export interface AdminEventListingItem {
  id: string;
  eventSlug: string;
  createdBy: AdminListingCreatorInfo;
  eventDate: AdminListingEventDate;
  eventSection: AdminListingEventSection;
  totalTickets: number;
  ticketsByStatus: AdminTicketStatusCounts;
  status: string;
  pricePerTicket: Money;
  createdAt: Date;
}

/**
 * Response for GET /api/admin/events/:eventId/listings
 */
export interface AdminEventListingsResponse {
  listings: AdminEventListingItem[];
  total: number;
}

// ==================== Admin Transaction Management ====================

/**
 * Query parameters for GET /api/admin/transactions
 */
export interface AdminTransactionsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * User reference for transaction list/detail
 */
export interface AdminTransactionUserRef {
  id: string;
  name: string;
  email: string;
}

/**
 * Listing/event reference for transaction list/detail
 */
export interface AdminTransactionListingRef {
  id: string;
  eventSlug: string;
  eventName: string;
  eventDate: Date;
  sectionName: string;
  quantity: number;
  pricePerTicket: Money;
}

/**
 * Payment confirmation summary for transaction list/detail
 */
export interface AdminTransactionPaymentConfirmationRef {
  id: string;
  status: string;
  originalFilename: string;
  createdAt: Date;
  reviewedAt?: Date;
  adminNotes?: string;
}

/**
 * Transaction list item for GET /api/admin/transactions
 */
export interface AdminTransactionListItem {
  id: string;
  seller: AdminTransactionUserRef;
  buyer: AdminTransactionUserRef;
  status: string;
  listing: AdminTransactionListingRef;
  totalPaid: Money;
  createdAt: Date;
  paymentConfirmation?: AdminTransactionPaymentConfirmationRef;
}

/**
 * Response for GET /api/admin/transactions
 */
export interface AdminTransactionsResponse {
  transactions: AdminTransactionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Response for GET /api/admin/transactions/pending-summary
 */
export interface AdminTransactionsPendingSummaryResponse {
  pendingConfirmationsCount: number;
  pendingTransactionsCount: number;
  /** Transaction IDs that have pending payment confirmations */
  pendingConfirmationTransactionIds: string[];
  /** Transaction IDs in PendingPayment status */
  pendingTransactionIds: string[];
}

/**
 * Request body for PATCH /api/admin/transactions/:id
 * All fields optional; only provided fields are updated.
 * Date fields accepted as ISO strings.
 */
export interface AdminUpdateTransactionRequest {
  status?: string;
  quantity?: number;
  ticketPrice?: Money;
  buyerPlatformFee?: Money;
  sellerPlatformFee?: Money;
  paymentMethodCommission?: Money;
  totalPaid?: Money;
  sellerReceives?: Money;
  paymentReceivedAt?: string | null;
  ticketTransferredAt?: string | null;
  buyerConfirmedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
  paymentApprovedAt?: string | null;
  paymentApprovedBy?: string | null;
  disputeId?: string | null;
  buyerId?: string;
  sellerId?: string;
  listingId?: string;
  requiredActor?: string;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
}

/**
 * Payout receipt file uploaded by admin when completing a seller payout.
 */
export interface AdminTransactionPayoutReceiptFile {
  id: string;
  transactionId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: Date;
}

/**
 * Transaction detail for GET /api/admin/transactions/:id
 */
export interface AdminTransactionDetailResponse {
  id: string;
  seller: AdminTransactionUserRef;
  buyer: AdminTransactionUserRef;
  status: string;
  listing: AdminTransactionListingRef;
  quantity: number;
  ticketPrice: Money;
  buyerPlatformFee: Money;
  sellerPlatformFee: Money;
  paymentMethodCommission: Money;
  totalPaid: Money;
  sellerReceives: Money;
  /** Payment method ID used for this transaction (optional if absent) */
  paymentMethodId?: string;
  /** Enriched payment method details (type and display name) when paymentMethodId is set */
  paymentMethod?: {
    id: string;
    type: string;
    name: string;
  };
  /** Promotion applied when the listing was created (from listing promotionSnapshot), if any */
  appliedPromotion?: {
    id: string;
    name: string;
    type: string;
    /** Promotion config (e.g. feePercentage for SELLER_DISCOUNTED_FEE) */
    config: Record<string, unknown>;
  };
  /** Timeline dates */
  createdAt: Date;
  paymentReceivedAt?: Date;
  ticketTransferredAt?: Date;
  buyerConfirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;
  paymentApprovedAt?: Date;
  paymentApprovedBy?: string;
  disputeId?: string;
  paymentConfirmations: Array<
    AdminTransactionPaymentConfirmationRef & {
      transactionId: string;
      uploadedBy: string;
      contentType: string;
    }
  >;
  /** Payout receipt files uploaded by admin when completing the seller payout */
  payoutReceiptFiles: AdminTransactionPayoutReceiptFile[];
  /** Bank transfer destination for proof validation (from payment method or seller bankAccount) */
  bankTransferDestination?: {
    holderName: string;
    cbuOrCvu: string;
    bankName?: string;
    cuitCuil?: string;
  };
}

/**
 * Ticket line for seller payout (section, quantity, unit price, optional seat labels).
 */
export interface AdminSellerPayoutTicketLine {
  sectionName: string;
  quantity: number;
  unitPrice: Money;
  seatLabels?: string[];
}

/**
 * Seller payout item for GET /api/admin/seller-payouts (transactions in TransferringFund).
 */
export interface AdminSellerPayoutItem {
  transactionId: string;
  eventName: string;
  eventDate: Date;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  /** Whether the seller has approved identity verification (VerifiedSeller) */
  sellerVerified: boolean;
  sellerReceives: Money;
  /** Bank transfer destination (seller's bank account for payout) */
  bankTransferDestination?: {
    holderName: string;
    cbuOrCvu: string;
    bankName?: string;
    cuitCuil?: string;
  };
  /** Ticket line for "Entradas" column: section, quantity, unit price, optional seat labels */
  ticketLine: AdminSellerPayoutTicketLine;
}

/**
 * Response for GET /api/admin/seller-payouts
 */
export interface AdminSellerPayoutsResponse {
  payouts: AdminSellerPayoutItem[];
}

/**
 * Response for POST /api/admin/transactions/:id/complete-payout
 */
export interface AdminCompletePayoutResponse {
  id: string;
  status: string;
}

/**
 * User search result for admin autocomplete (e.g. promotions).
 */
export interface AdminUserSearchItem {
  id: string;
  email: string;
}

export type AdminUserSearchResponse = AdminUserSearchItem[];

// ==================== Admin Dashboard Metrics ====================

export interface AdminDashboardMetricsUsers {
  total: number;
  phoneVerified: number;
  dniVerified: number;
  sellers: number;
  verifiedSellers: number;
}

export interface AdminDashboardMetricsEvents {
  totalPublished: number;
  totalActive: number;
  eventsToday: number;
  awaitingApproval: number;
}

export interface AdminDashboardMetricsSupportTickets {
  totalOpen: number;
  totalInProgress: number;
  totalResolved: number;
  total: number;
}

export interface AdminDashboardMetricsPending {
  identityVerifications: number;
  bankAccounts: number;
  eventsAwaitingApproval: number;
  buyerPaymentsPending: number;
  sellerPayoutsPending: number;
}

export interface AdminDashboardMetricsResponse {
  users: AdminDashboardMetricsUsers;
  events: AdminDashboardMetricsEvents;
  supportTickets: AdminDashboardMetricsSupportTickets;
  pending: AdminDashboardMetricsPending;
}

// ==================== Admin User Management ====================

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AdminUserListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerificationStatus: 'none' | 'pending' | 'approved' | 'rejected';
  bankAccountVerified: boolean;
  acceptedSellerTermsAt?: Date;
  createdAt: Date;
}

export interface AdminUsersResponse {
  users: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserDetailResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  publicName: string;
  role: string;
  status: string;
  phone?: string;
  country: string;
  currency: string;
  language: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  tosAcceptedAt?: Date;
  acceptedSellerTermsAt?: Date;
  identityVerification?: {
    status: string;
    legalFirstName: string;
    legalLastName: string;
    dateOfBirth: string;
    governmentIdNumber: string;
    submittedAt: Date;
    reviewedAt?: Date;
    rejectionReason?: string;
  };
  bankAccount?: {
    holderName: string;
    cbuOrCvu: string;
    verified: boolean;
    verifiedAt?: Date;
  };
  buyerDisputed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUpdateUserRequest {
  firstName?: string;
  lastName?: string;
  publicName?: string;
  email?: string;
  role?: string;
  status?: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  country?: string;
  currency?: string;
  language?: string;
  tosAcceptedAt?: Date | string | null;
  acceptedSellerTermsAt?: Date | string | null;
  buyerDisputed?: boolean;
  identityVerification?: {
    status?: string;
    rejectionReason?: string;
    reviewedAt?: Date | string | null;
  };
  bankAccount?: {
    holderName?: string;
    cbuOrCvu?: string;
    alias?: string;
    verified?: boolean;
    verifiedAt?: Date | string | null;
  };
}

export type AdminUpdateUserResponse = AdminUserDetailResponse;

// ==================== Admin Support Tickets ====================

/**
 * Query params for GET /api/admin/support-tickets
 */
export interface AdminSupportTicketsQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  source?: string;
}

/**
 * Support ticket list item for admin (matches SupportTicket shape)
 */
export interface AdminSupportTicketItem {
  id: string;
  userId?: string;
  transactionId?: string;
  category: string;
  source?: string;
  subject: string;
  description: string;
  guestName?: string;
  guestEmail?: string;
  guestId?: string;
  /** Display name of the user who opened the ticket (from User or guest) */
  initiatorName?: string;
  /** Email of the user who opened the ticket (from User or guest) */
  initiatorEmail?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

/**
 * Response for GET /api/admin/support-tickets
 */
export interface AdminSupportTicketsResponse {
  tickets: AdminSupportTicketItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Support message for admin ticket detail
 */
export interface AdminSupportMessageItem {
  id: string;
  ticketId: string;
  userId: string;
  isAdmin: boolean;
  message: string;
  attachmentUrls?: string[];
  createdAt: Date;
}

/**
 * Transaction summary shown on support ticket detail when the ticket is linked to a transaction.
 */
export interface AdminSupportTicketTransactionSummary {
  /** Role of the user who opened the ticket in the transaction (buyer or seller). Omitted when opener is guest. */
  initiatorRole?: 'buyer' | 'seller';
  /** Transaction status. */
  status: string;
  /** Ticket value (total for the quantity). */
  ticketPrice: Money;
  /** Number of tickets (or seats) in the transaction. */
  quantity: number;
  /** Amount paid by the buyer. */
  totalPaid: Money;
  /** Amount the seller receives. */
  sellerReceives: Money;
}

/**
 * Response for GET /api/admin/support-tickets/:id
 */
export interface AdminSupportTicketDetailResponse {
  id: string;
  userId?: string;
  transactionId?: string;
  category: string;
  source?: string;
  subject: string;
  description: string;
  guestName?: string;
  guestEmail?: string;
  guestId?: string;
  /** Display name of the user who opened the ticket (from User or guest). */
  initiatorName?: string;
  /** Email of the user who opened the ticket (from User or guest). */
  initiatorEmail?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  resolution?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  /** When the ticket is linked to a transaction, summary data for admin context. */
  transactionSummary?: AdminSupportTicketTransactionSummary;
  messages: AdminSupportMessageItem[];
}

/**
 * Request for PATCH /api/admin/support-tickets/:id/status
 */
export interface AdminUpdateSupportTicketStatusRequest {
  status: string;
}

/**
 * Response for PATCH /api/admin/support-tickets/:id/status
 */
export type AdminUpdateSupportTicketStatusResponse = AdminSupportTicketItem;

/**
 * Request for PATCH /api/admin/support-tickets/:id/resolve
 */
export interface AdminResolveSupportDisputeRequest {
  resolution: string;
  resolutionNotes: string;
}

/**
 * Response for PATCH /api/admin/support-tickets/:id/resolve
 */
export type AdminResolveSupportDisputeResponse = AdminSupportTicketItem;

/**
 * Request for POST /api/admin/support-tickets/:id/messages
 */
export interface AdminAddSupportTicketMessageRequest {
  message: string;
  attachmentUrls?: string[];
}

/**
 * Response for POST /api/admin/support-tickets/:id/messages
 */
export interface AdminAddSupportTicketMessageResponse {
  success: boolean;
  messageId: string;
}
