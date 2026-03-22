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
  isPopular?: boolean;
  /** Set as featured (shown in landing hero). */
  highlight?: boolean;
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
    isPopular: boolean;
    highlight: boolean;
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
  highlighted?: boolean;
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
  /** True when event has banners.rectangle. */
  hasRectangleBanner: boolean;
  /** Admin-set: featured event. */
  highlight: boolean;
  /** URL of the event's square banner image, if it exists. Used for crop-to-rectangle flow. */
  squareBannerUrl?: string;
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

export type AdminTransactionAuditLogAction = 'created' | 'updated';

export interface AdminTransactionAuditLogEntry {
  id: string;
  transactionId: string;
  action: AdminTransactionAuditLogAction;
  changedAt: Date;
  changedBy: string;
  payload: unknown;
}

export interface AdminTransactionAuditLogsResponse {
  transactionId: string;
  total: number;
  items: AdminTransactionAuditLogEntry[];
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
  /** Transfer proof uploaded by the seller (storage key present if uploaded) */
  transferProofStorageKey?: string;
  /** Original filename of the transfer proof for display */
  transferProofOriginalFilename?: string;
  /** Receipt proof uploaded by the buyer (storage key present if uploaded) */
  receiptProofStorageKey?: string;
  /** Original filename of the receipt proof for display */
  receiptProofOriginalFilename?: string;
  /** Bank transfer destination for proof validation (from payment method or seller bankAccount) */
  bankTransferDestination?: {
    holderName: string;
    cbuOrCvu: string;
    alias?: string;
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
    alias?: string;
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

// ==================== Admin Import Events ====================

/**
 * Seating type for imported sections (must match EventSection.seatingType).
 * Validation: use enum values 'numbered' | 'unnumbered'.
 */
export type ImportEventSeatingType = 'numbered' | 'unnumbered';

/**
 * Category for imported events (must match EventCategory).
 * Validation: use enum values e.g. 'Concert' | 'Sports' | 'Theater' | 'Festival' | 'Conference' | 'Comedy' | 'Other'.
 */
export type ImportEventCategory =
  | 'Concert'
  | 'Sports'
  | 'Theater'
  | 'Festival'
  | 'Conference'
  | 'Comedy'
  | 'Other';

/**
 * Address for imported event location.
 * Validation: line1, city, countryCode required; countryCode typically 2-letter ISO (e.g. AR, US).
 */
export interface ImportEventAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
}

/**
 * Single section in an imported event.
 * Validation: name non-empty; seatingType one of ImportEventSeatingType; section names should be unique per event.
 */
export interface ImportEventSectionItem {
  name: string;
  seatingType: ImportEventSeatingType;
}

/**
 * Single event in the import JSON.
 * Validation:
 * - name, venue: non-empty
 * - category: one of ImportEventCategory
 * - location: valid ImportEventAddress
 * - dates: at least one; each a valid ISO 8601 date-time string (e.g. "2025-06-15T20:00:00.000Z"); optional business rule: not in the past
 * - sections: optional; when present, unique names per event; valid seatingType
 * - sourceCode + sourceId: used for deduplication and storing importInfo on Event
 */
export interface ImportEventItem {
  name: string;
  category: ImportEventCategory;
  venue: string;
  location: ImportEventAddress;
  /** ISO 8601 date-time strings (minute precision). At least one required. */
  dates: string[];
  /** Optional sections; when present, names unique per event. */
  sections?: ImportEventSectionItem[];
  /** Source identifier for deduplication and Event.importInfo (e.g. "reventick"). */
  sourceCode: string;
  /** Source-specific event id for deduplication and Event.importInfo. */
  sourceId: string;
  /** Optional image as base64 or data URL (data:image/xxx;base64,...). Stored as event banner (square 1:1). */
  imageSquareBase64?: string;
  /** Optional image as base64 or data URL. Stored as event banner (rectangle 16:9). */
  imageRectangleBase64?: string;
  /** Optional image as base64 or data URL. Stored as event banner (og:image). */
  imageOGBase64?: string;
  /** Optional custom slug for the event URL. If omitted, slug is generated from name, venue, and event id. */
  slug?: string;
}

/**
 * Root shape of the import events JSON file.
 * Validation: events array required; may enforce max length (e.g. batch size) in the service.
 */
export interface ImportEventsPayload {
  events: ImportEventItem[];
}

/**
 * Single event in the import preview (no persistence).
 * Includes generated slug for display (using preview id; actual slug may differ slightly on import).
 */
export interface ImportEventsPreviewItem {
  index: number;
  name: string;
  category: ImportEventCategory;
  venue: string;
  location: ImportEventAddress;
  /** Generated slug for preview (based on name, venue, and preview id). */
  slug: string;
  datesCount: number;
  dateLabels: string[];
  sections?: ImportEventSectionItem[];
  sourceCode: string;
  sourceId: string;
}

/**
 * Response for POST /api/admin/events/import/preview.
 * Validation runs first; if invalid, use ImportEventsValidationErrorResponse instead.
 * eventsForImport is the deduped list of full items; client sends selected subset on execute.
 */
export interface ImportEventsPreviewResponse {
  events: ImportEventsPreviewItem[];
  eventsForImport: ImportEventItem[];
}

/**
 * Validation error for a single event in the import payload.
 */
export interface ImportEventValidationError {
  index: number;
  message: string;
  field?: string;
}

/**
 * Response when import payload validation fails.
 */
export interface ImportEventsValidationErrorResponse {
  valid: false;
  errors: ImportEventValidationError[];
}

/**
 * Result for a single created event (success or failure).
 */
export interface ImportEventResultItem {
  index: number;
  success: boolean;
  eventId?: string;
  slug?: string;
  name?: string;
  error?: string;
}

/**
 * Response for POST /api/admin/events/import (execute import).
 */
export interface ImportEventsResultResponse {
  total: number;
  created: number;
  failed: number;
  results: ImportEventResultItem[];
}

// ----- Events ranking (score) config -----

/**
 * Response for GET /api/admin/events-ranking/config
 */
export interface AdminGetEventsRankingConfigResponse {
  weightActiveListings: number;
  weightTransactions: number;
  weightProximity: number;
  weightPopular: number;
  jobIntervalMinutes: number;
  lastRunAt: string | null;
  updatedAt: string;
}

/**
 * Request body for PATCH /api/admin/events-ranking/config. All fields optional.
 */
export interface AdminPatchEventsRankingConfigRequest {
  weightActiveListings?: number;
  weightTransactions?: number;
  weightProximity?: number;
  weightPopular?: number;
  jobIntervalMinutes?: number;
}

/**
 * Request body for POST /api/admin/events-ranking/queue. Enqueue events for re-scoring.
 */
export interface AdminPostEventsRankingQueueRequest {
  eventIds: string[];
}

/**
 * Response for POST /api/admin/events-ranking/queue.
 */
export interface AdminPostEventsRankingQueueResponse {
  enqueued: number;
}

// ==================== Admin Featured Events ====================

/**
 * Request body for PATCH /api/admin/featured-events/:eventId
 */
export interface AdminSetFeaturedEventRequest {
  /** Whether the event should appear in the landing hero (GET /api/events/highlights). */
  highlighted: boolean;
}

/**
 * Response for PATCH /api/admin/featured-events/:eventId
 */
export interface AdminSetFeaturedEventResponse {
  eventId: string;
  highlighted: boolean;
}
