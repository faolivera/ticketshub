import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type {
  GetNotificationsResponse,
  GetUnreadCountResponse,
  MarkAsReadResponse,
  MarkAllAsReadResponse,
  MarkAsReadBatchRequest,
  MarkAsReadBatchResponse,
} from './notifications.api';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  /**
   * Get paginated in-app notifications for the authenticated user
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe)
    unreadOnly: boolean,
  ): Promise<ApiResponse<GetNotificationsResponse>> {
    const result = await this.service.getNotifications(
      ctx,
      user.id,
      page,
      limit,
      unreadOnly,
    );
    return { success: true, data: result };
  }

  /**
   * Get unread notification count (for header badge)
   */
  @Get('unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<GetUnreadCountResponse>> {
    const result = await this.service.getUnreadCount(ctx, user.id);
    return { success: true, data: result };
  }

  /**
   * Mark all notifications as read
   */
  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<MarkAllAsReadResponse>> {
    const result = await this.service.markAllAsRead(ctx, user.id);
    return { success: true, data: result };
  }

  /**
   * Mark multiple notifications as read by IDs (e.g. when user opens dropdown)
   */
  @Patch('read-batch')
  @UseGuards(JwtAuthGuard)
  async markAsReadBatch(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: MarkAsReadBatchRequest,
  ): Promise<ApiResponse<MarkAsReadBatchResponse>> {
    const ids = Array.isArray(body?.notificationIds) ? body.notificationIds : [];
    const result = await this.service.markAsReadBatch(ctx, user.id, ids);
    return { success: true, data: result };
  }

  /**
   * Mark a notification as read
   */
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') notificationId: string,
  ): Promise<ApiResponse<MarkAsReadResponse>> {
    const result = await this.service.markAsRead(ctx, user.id, notificationId);
    return { success: true, data: result };
  }
}
