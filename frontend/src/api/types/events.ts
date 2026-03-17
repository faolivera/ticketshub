import type { Address, Image, PaginationParams } from './common';
import type { SeatingType } from './tickets';

/**
 * Event approval status
 */
export enum EventStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

/**
 * Event date status
 */
export enum EventDateStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
  Cancelled = 'cancelled',
}

/**
 * Event category
 */
export enum EventCategory {
  Concert = 'Concert',
  Sports = 'Sports',
  Theater = 'Theater',
  Festival = 'Festival',
  Conference = 'Conference',
  Comedy = 'Comedy',
  Other = 'Other',
}

/**
 * Event banner metadata
 */
export interface EventBanner {
  type: 'square' | 'rectangle';
  filename: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  uploadedBy: string;
  uploadedAt: string;
}

/**
 * Event banners container (stored on event entity)
 */
export interface EventBanners {
  square?: EventBanner;
  rectangle?: EventBanner;
}

/**
 * Banner URLs returned by API
 */
export interface EventBannerUrls {
  square?: string;
  rectangle?: string;
  og_image?: string;
}

/**
 * Event entity
 */
export interface Event {
  id: string;
  slug: string;
  name: string;
  category: EventCategory;
  venue: string;
  location: Address;
  imageIds: string[];
  banners?: EventBanners;

  status: EventStatus;
  rejectionReason?: string;

  createdBy: string;
  approvedBy?: string;

  createdAt: Date;
  updatedAt: Date;
  /** Admin-set: mark as popular for ranking and display. */
  isPopular: boolean;
  /** Admin-set: featured event (shown in landing hero). */
  highlight: boolean;
}

/**
 * Event date entity
 * Single datetime field (date) includes both day and time, stored at minute precision
 */
export interface EventDate {
  id: string;
  eventId: string;

  date: Date;

  status: EventDateStatus;
  rejectionReason?: string;

  createdBy: string;
  approvedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event section status
 */
export enum EventSectionStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

/**
 * Event section entity
 */
export interface EventSection {
  id: string;
  eventId: string;
  name: string;
  seatingType: SeatingType;
  status: EventSectionStatus;
  rejectionReason?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Event with dates and sections
 */
export interface EventWithDates extends Event {
  dates: EventDate[];
  sections: EventSection[];
  images: Image[];
  bannerUrls?: EventBannerUrls;
}

// === API Types ===

/**
 * Request to create a new event
 */
export interface CreateEventRequest {
  name: string;
  category: EventCategory;
  venue: string;
  location: Address;
  imageIds?: string[];
}

/**
 * Response after creating an event
 */
export type CreateEventResponse = Event;

/**
 * Request to add a date to an event
 * date: ISO datetime string (day+time), normalized to minute precision
 */
export interface AddEventDateRequest {
  date: string;
}

/**
 * Response after adding a date
 */
export type AddEventDateResponse = EventDate;

/**
 * Request to approve/reject an event
 */
export interface ApproveEventRequest {
  approved: boolean;
  rejectionReason?: string;
}

/**
 * Response after approval action
 */
export type ApproveEventResponse = Event;

/**
 * Request to approve/reject an event date
 */
export interface ApproveEventDateRequest {
  approved: boolean;
  rejectionReason?: string;
}

/**
 * Response after date approval action
 */
export type ApproveEventDateResponse = EventDate;

/**
 * Request to add a section to an event
 */
export interface AddEventSectionRequest {
  name: string;
  seatingType: SeatingType;
}

/**
 * Response after adding a section
 */
export type AddEventSectionResponse = EventSection;

/**
 * Response for GET /api/events/:id (public shape only).
 * For full event (admin), use GET /api/admin/events/:eventId.
 */
export type GetEventResponse = PublicListEventItem;

/**
 * Response for listing events (full; used by GET /events/my/events)
 */
export type ListEventsResponse = EventWithDates[];

/**
 * Single public event shape (non-sensitive). Used by GET /events (list), GET /events/:id, GET /event-page/:slug.
 */
export interface PublicListEventLocation {
  city: string;
  countryCode: string;
}

export interface PublicListEventDate {
  id: string;
  date: string;
  status: string;
}

export interface PublicListEventSection {
  id: string;
  name: string;
  status: string;
  seatingType: SeatingType;
}

export interface PublicListEventItem {
  id: string;
  slug: string;
  name: string;
  category: EventCategory;
  venue: string;
  location: PublicListEventLocation;
  createdAt: string;
  /** Omitted in list; present for single-event and event-page */
  status?: string;
  /** Optional; used for client-side search filter when present */
  description?: string;
  bannerUrls?: EventBannerUrls;
  images: Array<{ src: string }>;
  dates: PublicListEventDate[];
  sections: PublicListEventSection[];
}

export type ListEventsPublicResponse = PublicListEventItem[];

/**
 * Query params for listing events (public API always returns approved events only).
 */
export interface ListEventsQuery extends PaginationParams {
  category?: EventCategory;
  search?: string;
  /** When true, return only featured (highlighted) events. */
  highlighted?: boolean;
}

/** Minimal event for selection UI */
export interface EventSelectItem {
  id: string;
  name: string;
  venue: string;
  category: EventCategory;
  squareBannerUrl?: string;
  rectangleBannerUrl?: string;
}

/** Query params for event selection */
export interface EventSelectQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

/** Response for event selection endpoint */
export interface EventSelectResponse {
  events: EventSelectItem[];
  total: number;
  hasMore: boolean;
}
