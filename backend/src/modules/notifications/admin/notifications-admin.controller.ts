import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { User } from '../../../common/decorators/user.decorator';
import { Context } from '../../../common/decorators/ctx.decorator';
import type { Ctx } from '../../../common/types/context';
import type { ApiResponse } from '../../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../../users/users.domain';
import { Role } from '../../users/users.domain';
import {
  NotificationEventType,
  NotificationEventStatus,
} from '../notifications.domain';
import type {
  GetTemplatesResponse,
  GetTemplateResponse,
  UpdateTemplateRequest,
  UpdateTemplateResponse,
  CreateTemplateRequest,
  CreateTemplateResponse,
  GetChannelConfigsResponse,
  GetChannelConfigResponse,
  UpdateChannelConfigRequest,
  UpdateChannelConfigResponse,
  GetEventsResponse,
  GetEventResponse,
  GetEventNotificationsResponse,
} from '../notifications.api';

@Controller('api/admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class NotificationsAdminController {
  constructor(private readonly service: NotificationsService) {}

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  /**
   * Get all notification templates
   */
  @Get('templates')
  async getTemplates(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<GetTemplatesResponse>> {
    const result = await this.service.getAllTemplates(ctx);
    return { success: true, data: result };
  }

  /**
   * Get a template by ID
   */
  @Get('templates/:id')
  async getTemplate(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetTemplateResponse>> {
    const result = await this.service.getTemplateById(ctx, id);
    return { success: true, data: result };
  }

  /**
   * Create a new template
   */
  @Post('templates')
  async createTemplate(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: CreateTemplateRequest,
  ): Promise<ApiResponse<CreateTemplateResponse>> {
    const result = await this.service.createTemplate(ctx, body, user.id);
    return { success: true, data: result };
  }

  /**
   * Update a template
   */
  @Put('templates/:id')
  async updateTemplate(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @Body() body: UpdateTemplateRequest,
  ): Promise<ApiResponse<UpdateTemplateResponse>> {
    const result = await this.service.updateTemplate(ctx, id, body, user.id);
    return { success: true, data: result };
  }

  // ==========================================================================
  // CHANNEL CONFIG
  // ==========================================================================

  /**
   * Get all channel configs
   */
  @Get('channel-config')
  async getChannelConfigs(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<GetChannelConfigsResponse>> {
    const result = await this.service.getAllChannelConfigs(ctx);
    return { success: true, data: result };
  }

  /**
   * Get channel config for an event type
   */
  @Get('channel-config/:eventType')
  async getChannelConfig(
    @Context() ctx: Ctx,
    @Param('eventType') eventType: NotificationEventType,
  ): Promise<ApiResponse<GetChannelConfigResponse>> {
    const result = await this.service.getChannelConfig(ctx, eventType);
    return { success: true, data: result };
  }

  /**
   * Update channel config for an event type
   */
  @Put('channel-config/:eventType')
  async updateChannelConfig(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('eventType') eventType: NotificationEventType,
    @Body() body: UpdateChannelConfigRequest,
  ): Promise<ApiResponse<UpdateChannelConfigResponse>> {
    const result = await this.service.updateChannelConfig(
      ctx,
      eventType,
      body,
      user.id,
    );
    return { success: true, data: result };
  }

  // ==========================================================================
  // EVENTS (AUDIT)
  // ==========================================================================

  /**
   * Get paginated notification events for audit
   */
  @Get('events')
  async getEvents(
    @Context() ctx: Ctx,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: NotificationEventType,
    @Query('status') status?: NotificationEventStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<ApiResponse<GetEventsResponse>> {
    const result = await this.service.getEvents(ctx, page, limit, {
      type,
      status,
      from,
      to,
    });
    return { success: true, data: result };
  }

  /**
   * Get a specific event by ID
   */
  @Get('events/:id')
  async getEvent(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetEventResponse>> {
    const result = await this.service.getEventById(ctx, id);
    return { success: true, data: result };
  }

  /**
   * Get notifications created from an event
   */
  @Get('events/:id/notifications')
  async getEventNotifications(
    @Context() ctx: Ctx,
    @Param('id') eventId: string,
  ): Promise<ApiResponse<GetEventNotificationsResponse>> {
    const notifications = await this.service.getEventNotifications(
      ctx,
      eventId,
    );
    return { success: true, data: { notifications } };
  }
}
