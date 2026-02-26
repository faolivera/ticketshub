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
  date: Date;
  startTime?: Date;
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
  date: string; // ISO date string
  doorsOpenAt?: string;
  startTime?: string;
  endTime?: string;
  status?: string; // Admin can set status directly
}

/**
 * Request for PATCH /api/admin/events/:id
 */
export interface AdminUpdateEventRequest {
  name?: string;
  description?: string;
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
    name: string;
    description: string;
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
    doorsOpenAt?: Date;
    startTime?: Date;
    endTime?: Date;
    status: string;
    createdBy: string;
    approvedBy?: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  deletedDateIds: string[];
  warnings?: string[];
}
