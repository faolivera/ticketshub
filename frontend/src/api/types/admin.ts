import type { Money, Address, CurrencyCode } from './common';

export type { CurrencyCode };
import type { EventCategory, EventDateStatus, Event, EventDate } from './events';

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

  // Transaction enrichment
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
  date: string;
  status: string;
  pendingListingsCount: number;
  createdAt: string;
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
  createdAt: string;
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
 * Pending event item for admin
 */
export interface AdminPendingEventItem {
  id: string;
  name: string;
  venue: string;
  category: string;
  status: string;
  createdAt: string;
  pendingDates: AdminPendingEventDateItem[];
  pendingSections: AdminPendingSectionItem[];
  pendingListingsCount: number;
  bannerUrls?: {
    square?: string;
    rectangle?: string;
  };
}

/**
 * Response for GET /api/admin/events/pending
 */
export interface AdminPendingEventsResponse {
  events: AdminPendingEventItem[];
  total: number;
}

/**
 * Event date update for admin event editing
 * date: ISO datetime string (day+time), minute precision
 */
export interface AdminEventDateUpdate {
  id?: string;
  date: string;
  status?: EventDateStatus;
}

/**
 * Request for PATCH /api/admin/events/:id
 */
export interface AdminUpdateEventRequest {
  name?: string;
  description?: string;
  category?: EventCategory;
  venue?: string;
  location?: Address;
  imageIds?: string[];
  dates?: AdminEventDateUpdate[];
  datesToDelete?: string[];
}

/**
 * Response for PATCH /api/admin/events/:id
 */
export interface AdminUpdateEventResponse {
  event: Event;
  dates: EventDate[];
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
  createdAt: string;
  updatedAt: string;
}

/**
 * Response for DELETE /api/admin/events/sections/:sectionId
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
  updatedAt: string;
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
  createdAt: string;
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
  date: string;
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
  createdBy: AdminListingCreatorInfo;
  eventDate: AdminListingEventDate;
  eventSection: AdminListingEventSection;
  totalTickets: number;
  ticketsByStatus: AdminTicketStatusCounts;
  eventSlug: string;
  status: string;
  pricePerTicket: {
    amount: number;
    currency: string;
  };
  createdAt: string;
}

/**
 * Response for GET /api/admin/events/:eventId/listings
 */
export interface AdminEventListingsResponse {
  listings: AdminEventListingItem[];
  total: number;
}

// === Admin Transactions (GET /admin/transactions) ===

/**
 * Query parameters for GET /api/admin/transactions
 */
export interface AdminTransactionsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * Transaction list item for admin transactions table
 */
export interface AdminTransactionListItem {
  id: string;
  seller: {
    id: string;
    name: string;
    email: string;
  };
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  listing: {
    id: string;
    eventSlug: string;
    eventName: string;
    eventDate: string;
    sectionName: string;
    quantity: number;
    pricePerTicket: Money;
  };
  totalPaid: Money;
  createdAt: string;
  paymentConfirmation?: {
    id: string;
    status: string;
    originalFilename: string;
    createdAt: string;
    reviewedAt?: string;
    adminNotes?: string;
  };
}

/**
 * Response for GET /api/admin/transactions (paginated)
 */
export interface AdminTransactionsResponse {
  transactions: AdminTransactionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Request body for PATCH /api/admin/transactions/:id
 * All fields optional; only provided fields are updated. Date fields as ISO strings.
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
 * Payment confirmation item for admin transaction detail
 */
export interface AdminTransactionPaymentConfirmation {
  id: string;
  transactionId: string;
  originalFilename: string;
  contentType: string;
  status: string;
  createdAt: string;
  reviewedAt?: string;
  adminNotes?: string;
}

/**
 * Payout receipt file uploaded by admin when completing a seller payout
 */
export interface AdminTransactionPayoutReceiptFile {
  id: string;
  transactionId: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
}

/**
 * Transaction detail for admin (single transaction with confirmations)
 */
export interface AdminTransactionDetail {
  id: string;
  seller: {
    id: string;
    name: string;
    email: string;
  };
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  status: string;
  listing: {
    id: string;
    eventSlug: string;
    eventName: string;
    eventDate: string;
    sectionName: string;
    quantity: number;
    pricePerTicket: Money;
  };
  quantity: number;
  ticketPrice: Money;
  buyerPlatformFee: Money;
  sellerPlatformFee: Money;
  paymentMethodCommission: Money;
  totalPaid: Money;
  sellerReceives: Money;
  createdAt: string;
  paymentReceivedAt?: string;
  ticketTransferredAt?: string;
  buyerConfirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  paymentApprovedAt?: string;
  paymentMethodId?: string;
  /** Enriched payment method (type and display name) when paymentMethodId is set */
  paymentMethod?: {
    id: string;
    type: string;
    name: string;
  };
  /** Promotion applied when the listing was created (if any) */
  appliedPromotion?: {
    id: string;
    name: string;
    type: string;
    /** Promotion config (e.g. feePercentage for SELLER_DISCOUNTED_FEE) */
    config: Record<string, unknown>;
  };
  paymentConfirmations: AdminTransactionPaymentConfirmation[];
  payoutReceiptFiles: AdminTransactionPayoutReceiptFile[];
  bankTransferDestination?: {
    holderName: string;
    iban: string;
    bic?: string;
    bankName?: string;
    cuitCuil?: string;
  };
}

/**
 * Response for GET /api/admin/transactions/:id
 */
export interface AdminTransactionDetailResponse {
  id: string;
  seller: AdminTransactionDetail['seller'];
  buyer: AdminTransactionDetail['buyer'];
  status: string;
  listing: AdminTransactionDetail['listing'];
  quantity: number;
  ticketPrice: Money;
  buyerPlatformFee: Money;
  sellerPlatformFee: Money;
  paymentMethodCommission: Money;
  totalPaid: Money;
  sellerReceives: Money;
  createdAt: string;
  paymentReceivedAt?: string;
  ticketTransferredAt?: string;
  buyerConfirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  paymentApprovedAt?: string;
  paymentApprovedBy?: string | null;
  disputeId?: string | null;
  paymentMethodId?: string;
  paymentMethod?: AdminTransactionDetail['paymentMethod'];
  appliedPromotion?: AdminTransactionDetail['appliedPromotion'];
  paymentConfirmations: AdminTransactionPaymentConfirmation[];
  payoutReceiptFiles: AdminTransactionPayoutReceiptFile[];
  bankTransferDestination?: {
    holderName: string;
    iban: string;
    bic?: string;
    bankName?: string;
    cuitCuil?: string;
  };
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

// === Admin Payment Methods ===

import type {
  PaymentMethodOption,
  PaymentMethodType,
  PaymentGatewayProvider,
  BankTransferConfig,
} from './tickets';

/**
 * Request to create a payment method (admin)
 */
export interface AdminCreatePaymentMethodRequest {
  name: string;
  publicName: string;
  type: PaymentMethodType;
  buyerCommissionPercent: number | null;
  gatewayProvider?: PaymentGatewayProvider;
  gatewayConfigEnvPrefix?: string;
  bankTransferConfig?: BankTransferConfig;
}

/**
 * Request to update a payment method (admin)
 */
export interface AdminUpdatePaymentMethodRequest {
  name?: string;
  publicName?: string;
  status?: 'enabled' | 'disabled';
  buyerCommissionPercent?: number | null;
  gatewayProvider?: PaymentGatewayProvider;
  gatewayConfigEnvPrefix?: string;
  bankTransferConfig?: BankTransferConfig;
}

/**
 * Response for GET /api/admin/payment-methods
 */
export type AdminPaymentMethodsResponse = PaymentMethodOption[];

/**
 * Response for GET /api/admin/payment-methods/:id
 */
export type AdminPaymentMethodResponse = PaymentMethodOption;

// === Admin Platform Config (GET/PATCH /admin/config/platform) ===

/**
 * Buyer-facing risk config: when to require V2 (phone) and V3 (DNI) at checkout.
 */
export interface RiskEngineBuyerConfig {
  phoneRequiredEventHours: number;
  /** Require phone when order total >= this amount (USD or ARS only). */
  phoneRequiredAmount: Money;
  phoneRequiredQtyTickets: number;
  newAccountDays: number;
  dniRequiredEventHours: number;
  /** Require DNI when order total >= this amount (USD or ARS only). */
  dniRequiredAmount: Money;
  dniRequiredQtyTickets: number;
  dniNewAccountDays: number;
}

/**
 * Seller-facing risk config: Tier 0 limits and payout hold.
 */
export interface RiskEngineSellerConfig {
  unverifiedSellerMaxSales: number;
  unverifiedSellerMaxAmount: Money;
  payoutHoldHoursDefault: number;
  payoutHoldHoursUnverified: number;
}

/**
 * Time window for one claim type (min/max hours from reference date).
 */
export interface ClaimTypeWindowConfig {
  minimumClaimHours: number;
  maximumClaimHours: number;
}

/**
 * Claims / disputes config: time window per claim type.
 */
export interface RiskEngineClaimsConfig {
  ticketNotReceived: ClaimTypeWindowConfig;
  ticketDidntWork: ClaimTypeWindowConfig;
}

/**
 * Risk engine config, grouped by buyer / seller / claims.
 */
export interface RiskEngineConfig {
  buyer: RiskEngineBuyerConfig;
  seller: RiskEngineSellerConfig;
  claims: RiskEngineClaimsConfig;
}

/**
 * Exchange rates for currency conversion (admin-configured).
 */
export interface ExchangeRatesConfig {
  usdToArs: number;
}

/**
 * Platform config (fees and timeouts). Admin-only.
 */
export interface PlatformConfig {
  buyerPlatformFeePercentage: number;
  sellerPlatformFeePercentage: number;
  paymentTimeoutMinutes: number;
  adminReviewTimeoutHours: number;
  offerPendingExpirationMinutes?: number;
  offerAcceptedExpirationMinutes?: number;
  transactionChatPollIntervalSeconds: number;
  transactionChatMaxMessages: number;
  riskEngine: RiskEngineConfig;
  exchangeRates: ExchangeRatesConfig;
}

/**
 * Request body for PATCH /api/admin/config/platform
 */
export interface UpdatePlatformConfigRequest {
  buyerPlatformFeePercentage?: number;
  sellerPlatformFeePercentage?: number;
  paymentTimeoutMinutes?: number;
  adminReviewTimeoutHours?: number;
  offerPendingExpirationMinutes?: number;
  offerAcceptedExpirationMinutes?: number;
  transactionChatPollIntervalSeconds?: number;
  transactionChatMaxMessages?: number;
  riskEngine?: {
    buyer?: Partial<RiskEngineBuyerConfig>;
    seller?: Partial<RiskEngineSellerConfig> & { unverifiedSellerMaxAmount?: Money };
    claims?: Partial<RiskEngineClaimsConfig>;
  };
  exchangeRates?: Partial<ExchangeRatesConfig>;
}

// === Admin Promotions (GET/POST /admin/promotions, PATCH /admin/promotions/:id/status) ===

export type PromotionType = 'SELLER_DISCOUNTED_FEE' | 'BUYER_DISCOUNTED_FEE';
export type PromotionStatus = 'active' | 'inactive';

export interface AdminPromotionListItem {
  id: string;
  userId: string;
  userEmail?: string;
  name: string;
  type: PromotionType;
  config: { feePercentage: number };
  maxUsages: number;
  usedCount: number;
  usedInListingIds: string[];
  status: PromotionStatus;
  validUntil: string | null;
  createdAt: string;
  createdBy: string;
}

export interface AdminCreatePromotionRequest {
  name: string;
  type: PromotionType;
  config: { feePercentage: number };
  maxUsages: number;
  validUntil?: string | null;
  userIds?: string[];
  emails?: string[];
}

/** User search result for admin autocomplete (e.g. promotions). */
export interface AdminUserSearchItem {
  id: string;
  email: string;
}

// === Admin Dashboard Metrics (GET /admin/dashboard-metrics) ===

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

// === Admin User Management ===

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
  acceptedSellerTermsAt?: string;
  createdAt: string;
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
  tosAcceptedAt?: string;
  acceptedSellerTermsAt?: string;
  identityVerification?: {
    status: string;
    legalFirstName: string;
    legalLastName: string;
    dateOfBirth: string;
    governmentIdNumber: string;
    submittedAt: string;
    reviewedAt?: string;
    rejectionReason?: string;
  };
  bankAccount?: {
    holderName: string;
    cbuOrCvu: string;
    verified: boolean;
    verifiedAt?: string;
  };
  buyerDisputed: boolean;
  createdAt: string;
  updatedAt: string;
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
  tosAcceptedAt?: string | null;
  acceptedSellerTermsAt?: string | null;
  buyerDisputed?: boolean;
  identityVerification?: {
    status?: string;
    rejectionReason?: string;
    reviewedAt?: string | null;
  };
  bankAccount?: {
    holderName?: string;
    cbuOrCvu?: string;
    alias?: string;
    verified?: boolean;
    verifiedAt?: string | null;
  };
}

// === Admin Seller Payouts (GET /admin/seller-payouts, POST /admin/transactions/:id/complete-payout) ===

export interface AdminSellerPayoutTicketLine {
  sectionName: string;
  quantity: number;
  unitPrice: Money;
  seatLabels?: string[];
}

export interface AdminSellerPayoutItem {
  transactionId: string;
  eventName: string;
  eventDate: string;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  /** Whether the seller has approved identity verification (VerifiedSeller). */
  sellerVerified: boolean;
  sellerReceives: Money;
  bankTransferDestination?: {
    holderName: string;
    iban: string;
    bic?: string;
    bankName?: string;
    cuitCuil?: string;
  };
  ticketLine: AdminSellerPayoutTicketLine;
}

export interface AdminSellerPayoutsResponse {
  payouts: AdminSellerPayoutItem[];
}

export interface AdminCompletePayoutResponse {
  id: string;
  status: string;
}

// === Admin Support Tickets ===

export interface AdminSupportTicketsQuery {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  source?: string;
}

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
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface AdminSupportTicketsResponse {
  tickets: AdminSupportTicketItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminSupportMessageItem {
  id: string;
  ticketId: string;
  userId: string;
  isAdmin: boolean;
  message: string;
  attachmentUrls?: string[];
  createdAt: string;
}

/** Transaction summary for support ticket detail when the ticket is linked to a transaction. */
export interface AdminSupportTicketTransactionSummary {
  initiatorRole?: 'buyer' | 'seller';
  status: string;
  ticketPrice: Money;
  quantity: number;
  totalPaid: Money;
  sellerReceives: Money;
}

export interface AdminSupportTicketDetailResponse extends AdminSupportTicketItem {
  /** When the ticket is linked to a transaction, summary data for admin context. */
  transactionSummary?: AdminSupportTicketTransactionSummary;
  messages: AdminSupportMessageItem[];
}

export interface AdminUpdateSupportTicketStatusRequest {
  status: string;
}

export interface AdminResolveSupportDisputeRequest {
  resolution: string;
  resolutionNotes: string;
}

export interface AdminAddSupportTicketMessageRequest {
  message: string;
  attachmentUrls?: string[];
}

export interface AdminAddSupportTicketMessageResponse {
  success: boolean;
  messageId: string;
}
