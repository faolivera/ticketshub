import apiClient from '../client';
import type {
  CreateEventRequest,
  CreateEventResponse,
  GetEventResponse,
  ListEventsResponse,
  ListEventsQuery,
  AddEventDateRequest,
  AddEventDateResponse,
  ApproveEventRequest,
  ApproveEventResponse,
  ApproveEventDateRequest,
  ApproveEventDateResponse,
  AddEventSectionRequest,
  AddEventSectionResponse,
  EventSection,
} from '../types';

/**
 * Events service
 */
export const eventsService = {
  /**
   * List events with optional filters
   */
  async listEvents(query?: ListEventsQuery): Promise<ListEventsResponse> {
    const response = await apiClient.get<ListEventsResponse>('/events', { params: query });
    return response.data;
  },

  /**
   * Get event by ID
   */
  async getEvent(id: string): Promise<GetEventResponse> {
    const response = await apiClient.get<GetEventResponse>(`/events/${id}`);
    return response.data;
  },

  /**
   * Create a new event
   */
  async createEvent(data: CreateEventRequest): Promise<CreateEventResponse> {
    const response = await apiClient.post<CreateEventResponse>('/events', data);
    return response.data;
  },

  /**
   * Add a date to an event
   */
  async addEventDate(eventId: string, data: AddEventDateRequest): Promise<AddEventDateResponse> {
    const response = await apiClient.post<AddEventDateResponse>(`/events/${eventId}/dates`, data);
    return response.data;
  },

  /**
   * Get my events (as creator)
   */
  async getMyEvents(): Promise<ListEventsResponse> {
    const response = await apiClient.get<ListEventsResponse>('/events/my/events');
    return response.data;
  },

  /**
   * Approve or reject an event (admin only)
   */
  async approveEvent(eventId: string, data: ApproveEventRequest): Promise<ApproveEventResponse> {
    const response = await apiClient.patch<ApproveEventResponse>(`/events/${eventId}/approve`, data);
    return response.data;
  },

  /**
   * Approve or reject an event date (admin only)
   */
  async approveEventDate(dateId: string, data: ApproveEventDateRequest): Promise<ApproveEventDateResponse> {
    const response = await apiClient.patch<ApproveEventDateResponse>(`/events/dates/${dateId}/approve`, data);
    return response.data;
  },

  /**
   * Add a section to an event
   */
  async addEventSection(eventId: string, data: AddEventSectionRequest): Promise<AddEventSectionResponse> {
    const response = await apiClient.post<AddEventSectionResponse>(`/events/${eventId}/sections`, data);
    return response.data;
  },

  /**
   * Get sections for an event
   */
  async getEventSections(eventId: string): Promise<EventSection[]> {
    const response = await apiClient.get<EventSection[]>(`/events/${eventId}/sections`);
    return response.data;
  },
};

export default eventsService;
