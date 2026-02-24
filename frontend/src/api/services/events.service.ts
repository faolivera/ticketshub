import apiClient from '../client';
import type {
  CreateEventRequest,
  CreateEventResponse,
  GetEventResponse,
  ListEventsResponse,
  ListEventsQuery,
  AddEventDateRequest,
  AddEventDateResponse,
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
};

export default eventsService;
