import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import { Role } from '../users/users.domain';
import type {
  CreateEventRequest,
  CreateEventResponse,
  AddEventDateRequest,
  AddEventDateResponse,
  ApproveEventRequest,
  ApproveEventResponse,
  ApproveEventDateRequest,
  ApproveEventDateResponse,
  GetEventResponse,
  ListEventsResponse,
  ListEventsQuery,
} from './events.api';
import { EventCategory } from './events.domain';

@Controller('api/events')
export class EventsController {
  constructor(
    @Inject(EventsService)
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Create a new event
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createEvent(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: CreateEventRequest,
  ): Promise<ApiResponse<CreateEventResponse>> {
    const event = await this.eventsService.createEvent(
      ctx,
      user.id,
      user.role,
      user.level,
      body,
    );
    return { success: true, data: event };
  }

  /**
   * List approved events (public)
   */
  @Get()
  async listEvents(
    @Context() ctx: Ctx,
    @Query('status') status?: string,
    @Query('category') category?: EventCategory,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ApiResponse<ListEventsResponse>> {
    const query: ListEventsQuery = {
      status,
      category,
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    const events = await this.eventsService.listEvents(ctx, query, false);
    return { success: true, data: events };
  }

  /**
   * Get event by ID
   */
  @Get(':id')
  async getEvent(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetEventResponse>> {
    const event = await this.eventsService.getEventById(ctx, id);
    return { success: true, data: event };
  }

  /**
   * Add a date to an event
   */
  @Post(':id/dates')
  @UseGuards(JwtAuthGuard)
  async addEventDate(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') eventId: string,
    @Body() body: AddEventDateRequest,
  ): Promise<ApiResponse<AddEventDateResponse>> {
    const date = await this.eventsService.addEventDate(
      ctx,
      eventId,
      user.id,
      user.role,
      body,
    );
    return { success: true, data: date };
  }

  /**
   * Approve or reject an event (admin only)
   */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async approveEvent(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') eventId: string,
    @Body() body: ApproveEventRequest,
  ): Promise<ApiResponse<ApproveEventResponse>> {
    const event = await this.eventsService.approveEvent(
      ctx,
      eventId,
      user.id,
      body.approved,
      body.rejectionReason,
    );
    return { success: true, data: event };
  }

  /**
   * Approve or reject an event date (admin only)
   */
  @Patch('dates/:dateId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async approveEventDate(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('dateId') dateId: string,
    @Body() body: ApproveEventDateRequest,
  ): Promise<ApiResponse<ApproveEventDateResponse>> {
    const date = await this.eventsService.approveEventDate(
      ctx,
      dateId,
      user.id,
      body.approved,
      body.rejectionReason,
    );
    return { success: true, data: date };
  }

  /**
   * Get pending events for admin review
   */
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getPendingEvents(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<ListEventsResponse>> {
    const events = await this.eventsService.getPendingEvents(ctx);
    return { success: true, data: events };
  }

  /**
   * Get my events
   */
  @Get('my/events')
  @UseGuards(JwtAuthGuard)
  async getMyEvents(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<ListEventsResponse>> {
    const events = await this.eventsService.getMyEvents(ctx, user.id);
    return { success: true, data: events };
  }
}
