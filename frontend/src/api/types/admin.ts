import type { Money, Address } from './common';
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
  sellerFee: Money;
  buyerFee: Money;
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
    eventName: string;
    eventDate: string;
    sectionName: string;
    quantity: number;
    pricePerTicket: Money;
  };
  quantity: number;
  ticketPrice: Money;
  buyerFee: Money;
  sellerFee: Money;
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
  paymentConfirmations: AdminTransactionPaymentConfirmation[];
  bankTransferDestination?: {
    holderName: string;
    iban: string;
    bic?: string;
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
  buyerFee: Money;
  sellerFee: Money;
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
  paymentConfirmations: AdminTransactionPaymentConfirmation[];
  bankTransferDestination?: {
    holderName: string;
    iban: string;
    bic?: string;
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
