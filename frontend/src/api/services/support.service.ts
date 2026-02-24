import apiClient from '../client';
import type {
  CreateSupportTicketRequest,
  CreateSupportTicketResponse,
  GetSupportTicketResponse,
  ListSupportTicketsResponse,
  ListSupportTicketsQuery,
  AddMessageRequest,
  AddMessageResponse,
} from '../types';

/**
 * Support service
 */
export const supportService = {
  /**
   * Create a support ticket
   */
  async createTicket(data: CreateSupportTicketRequest): Promise<CreateSupportTicketResponse> {
    const response = await apiClient.post<CreateSupportTicketResponse>('/support', data);
    return response.data;
  },

  /**
   * List support tickets
   */
  async listTickets(query?: ListSupportTicketsQuery): Promise<ListSupportTicketsResponse> {
    const response = await apiClient.get<ListSupportTicketsResponse>('/support', { params: query });
    return response.data;
  },

  /**
   * Get ticket by ID
   */
  async getTicket(id: string): Promise<GetSupportTicketResponse> {
    const response = await apiClient.get<GetSupportTicketResponse>(`/support/${id}`);
    return response.data;
  },

  /**
   * Add message to ticket
   */
  async addMessage(ticketId: string, data: AddMessageRequest): Promise<AddMessageResponse> {
    const response = await apiClient.post<AddMessageResponse>(
      `/support/${ticketId}/messages`,
      data
    );
    return response.data;
  },

  /**
   * Close a ticket
   */
  async closeTicket(id: string): Promise<{ closed: boolean }> {
    const response = await apiClient.post<{ closed: boolean }>(`/support/${id}/close`);
    return response.data;
  },
};

export default supportService;
