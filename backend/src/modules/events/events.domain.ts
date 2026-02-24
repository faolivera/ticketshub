import type { Address } from '../shared/address.domain';

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
 * Event entity
 */
export interface Event {
  id: string;
  name: string;
  description: string;
  category: EventCategory;
  venue: string;
  location: Address;
  imageIds: string[];
  
  status: EventStatus;
  rejectionReason?: string;
  
  createdBy: string; // userId
  approvedBy?: string; // adminId
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event date entity - an event can have multiple dates
 */
export interface EventDate {
  id: string;
  eventId: string;
  
  date: Date;
  doorsOpenAt?: Date;
  startTime?: Date;
  endTime?: Date;
  
  status: EventDateStatus;
  rejectionReason?: string;
  
  createdBy: string;
  approvedBy?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event with dates for display
 */
export interface EventWithDates extends Event {
  dates: EventDate[];
}
