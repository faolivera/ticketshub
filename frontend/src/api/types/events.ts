import type { Address, Image, PaginationParams } from './common';

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

  createdBy: string;
  approvedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event date entity
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
 * Event with dates
 */
export interface EventWithDates extends Event {
  dates: EventDate[];
  images: Image[];
}

// === API Types ===

/**
 * Request to create a new event
 */
export interface CreateEventRequest {
  name: string;
  description: string;
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
 */
export interface AddEventDateRequest {
  date: Date;
  doorsOpenAt?: Date;
  startTime?: Date;
  endTime?: Date;
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
 * Response for getting event details
 */
export type GetEventResponse = EventWithDates;

/**
 * Response for listing events
 */
export type ListEventsResponse = EventWithDates[];

/**
 * Query params for listing events
 */
export interface ListEventsQuery extends PaginationParams {
  status?: string;
  category?: EventCategory;
  search?: string;
}
