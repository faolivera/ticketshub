import type { Address } from '../shared/address.domain';
import type { Image } from '../images/images.domain';
import type {
  EventCategory,
  Event,
  EventDate,
  EventWithDates,
} from './events.domain';

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
export type GetEventResponse = EventWithDatesResponse;

/**
 * Response for listing events
 */
export type ListEventsResponse = EventWithDatesResponse[];

/**
 * Event with dates and resolved images
 */
export type EventWithDatesResponse = EventWithDates & {
  images: Image[];
};

/**
 * Query params for listing events
 */
export interface ListEventsQuery {
  status?: string;
  category?: EventCategory;
  search?: string;
  limit?: number;
  offset?: number;
}
