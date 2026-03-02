import type { Address } from '../shared/address.domain';
import type { SeatingType } from '../tickets/tickets.domain';

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
 * Event section status
 */
export enum EventSectionStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
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
 * Event entity
 */
export interface Event {
  id: string;
  name: string;
  category: EventCategory;
  venue: string;
  location: Address;
  imageIds: string[];
  banners?: EventBanners;

  status: EventStatus;
  rejectionReason?: string;

  createdBy: string; // userId
  approvedBy?: string; // adminId

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event date entity - an event can have multiple dates
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
 * Event section entity - an event can have multiple sections (e.g., VIP, General, Balcony)
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

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event with dates and sections for display
 */
export interface EventWithDates extends Event {
  dates: EventDate[];
  sections: EventSection[];
}

/**
 * Event banner types
 */
export type EventBannerType = 'square' | 'rectangle';

export type EventBannerMimeType = 'image/png' | 'image/jpeg' | 'image/webp';

export const ALLOWED_BANNER_MIME_TYPES: EventBannerMimeType[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

/**
 * Banner constraints
 */
export const BANNER_CONSTRAINTS = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  square: {
    minWidth: 300,
    minHeight: 300,
    aspectRatio: 1,
    aspectTolerance: 0.01,
  },
  rectangle: {
    minWidth: 640,
    minHeight: 360,
    aspectRatio: 16 / 9,
    aspectTolerance: 0.02,
  },
} as const;

/**
 * Event banner metadata
 */
export interface EventBanner {
  type: EventBannerType;
  filename: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  width: number;
  height: number;
  uploadedBy: string;
  uploadedAt: Date;
}

/**
 * Event banners container
 */
export interface EventBanners {
  square?: EventBanner;
  rectangle?: EventBanner;
}
