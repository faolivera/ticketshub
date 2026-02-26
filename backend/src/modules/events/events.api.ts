import type { Address } from '../shared/address.domain';
import type { Image } from '../images/images.domain';
import type { SeatingType } from '../tickets/tickets.domain';
import type {
  EventCategory,
  Event,
  EventDate,
  EventSection,
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
 * Request to approve/reject an event section
 */
export interface ApproveEventSectionRequest {
  approved: boolean;
  rejectionReason?: string;
}

/**
 * Response after section approval action
 */
export type ApproveEventSectionResponse = EventSection;

/**
 * Response for an event section
 */
export interface EventSectionResponse {
  id: string;
  eventId: string;
  name: string;
  seatingType: SeatingType;
  status: string;
  rejectionReason?: string;
  createdBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
