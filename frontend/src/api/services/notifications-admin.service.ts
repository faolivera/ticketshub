import apiClient from '../client';
import type {
  NotificationChannelConfig,
  NotificationChannelConfigsResponse,
  NotificationTemplate,
  NotificationTemplatesResponse,
  UpdateChannelConfigRequest,
  UpdateTemplateRequest,
  NotificationEventType,
} from '../types/notifications';

export const notificationsAdminService = {
  async getChannelConfigs(): Promise<NotificationChannelConfig[]> {
    const response = await apiClient.get<NotificationChannelConfigsResponse>(
      '/admin/notifications/channel-config'
    );
    return response.data.configs;
  },

  async updateChannelConfig(
    eventType: NotificationEventType,
    data: UpdateChannelConfigRequest
  ): Promise<NotificationChannelConfig> {
    const response = await apiClient.put<NotificationChannelConfig>(
      `/admin/notifications/channel-config/${eventType}`,
      data
    );
    return response.data;
  },

  async getTemplates(): Promise<NotificationTemplate[]> {
    const response = await apiClient.get<NotificationTemplatesResponse>(
      '/admin/notifications/templates'
    );
    return response.data.templates;
  },

  async updateTemplate(
    id: string,
    data: UpdateTemplateRequest
  ): Promise<NotificationTemplate> {
    const response = await apiClient.put<NotificationTemplate>(
      `/admin/notifications/templates/${id}`,
      data
    );
    return response.data;
  },
};

export default notificationsAdminService;
