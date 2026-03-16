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
 * Import source metadata (admin-only). Never expose in public APIs.
 */
export interface EventImportInfo {
  sourceCode: string;
  sourceId: string;
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
  /** Admin-only: set when event was imported; never expose in public APIs. */
  importInfo?: EventImportInfo;

  status: EventStatus;
  rejectionReason?: string;

  createdBy: string; // userId
  approvedBy?: string; // adminId

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a URL-safe slug from event name, venue, and a unique suffix.
 * Used for default slug on event creation; admin can change it on approval.
 */
export function generateEventSlug(
  name: string,
  venue: string,
  id: string,
): string {
  const base = [name, venue].filter(Boolean).join(' ');
  const slugified = base
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = id.length >= 8 ? id.slice(0, 8) : id;
  return (slugified || 'event') + '-' + suffix;
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
 * - square: 1:1 (mobile, thumbnails)
 * - rectangle: 16:9 (desktop cards)
 * - og_image: 1200×630 for og:image / twitter:image (optional, admin only)
 */
export type EventBannerType = 'square' | 'rectangle' | 'og_image';

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
  og_image?: EventBanner;
}
