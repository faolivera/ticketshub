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
  startTime?: string;
  status: string;
  pendingListingsCount: number;
  createdAt: string;
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
 */
export interface AdminEventDateUpdate {
  id?: string;
  date: string;
  doorsOpenAt?: string;
  startTime?: string;
  endTime?: string;
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
