import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Multer } from 'multer';
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
  AddEventSectionRequest,
  AddEventSectionResponse,
  UploadEventBannerResponse,
  GetEventBannersResponse,
  DeleteEventBannerResponse,
  EventSelectResponse,
} from './events.api';
import {
  EventCategory,
  BANNER_CONSTRAINTS,
  ALLOWED_BANNER_MIME_TYPES,
  type EventBannerType,
  type EventBannerMimeType,
} from './events.domain';
import type { EventSection } from './events.domain';

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
   * Always includes pending and approved dates/sections (excludes rejected)
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
   * Get paginated events for selection UI (public).
   * Returns minimal event data optimized for infinite scroll grid.
   */
  @Get('select')
  async getEventsForSelection(
    @Context() ctx: Ctx,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ApiResponse<EventSelectResponse>> {
    const result = await this.eventsService.getEventsForSelection(ctx, {
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { success: true, data: result };
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

  /**
   * Add a section to an event
   */
  @Post(':eventId/sections')
  @UseGuards(JwtAuthGuard)
  async addSection(
    @Context() ctx: Ctx,
    @Param('eventId') eventId: string,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: AddEventSectionRequest,
  ): Promise<ApiResponse<AddEventSectionResponse>> {
    const section = await this.eventsService.addEventSection(
      ctx,
      eventId,
      user.id,
      user.role,
      body,
    );
    return { success: true, data: section };
  }

  /**
   * Get sections for an event (public, approved only)
   */
  @Get(':eventId/sections')
  async getSections(
    @Context() ctx: Ctx,
    @Param('eventId') eventId: string,
  ): Promise<ApiResponse<EventSection[]>> {
    const sections = await this.eventsService.getApprovedSectionsByEventId(
      ctx,
      eventId,
    );
    return { success: true, data: sections };
  }

  // ==================== Event Banners ====================

  /**
   * Upload a banner for an event.
   * Only event creator or admin can upload.
   */
  @Post(':id/banners/:type')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: BANNER_CONSTRAINTS.maxSizeBytes },
      fileFilter: (_req, file, cb) => {
        if (
          ALLOWED_BANNER_MIME_TYPES.includes(file.mimetype as EventBannerMimeType)
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Invalid file type. Allowed: PNG, JPEG, WebP'),
            false,
          );
        }
      },
    }),
  )
  async uploadBanner(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') eventId: string,
    @Param('type') bannerType: string,
    @UploadedFile() file: Multer.File,
  ): Promise<ApiResponse<UploadEventBannerResponse>> {
    if (bannerType !== 'square' && bannerType !== 'rectangle') {
      throw new BadRequestException('Banner type must be "square" or "rectangle"');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.eventsService.uploadBanner(
      ctx,
      eventId,
      user.id,
      user.role,
      bannerType as EventBannerType,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    );

    return { success: true, data: result };
  }

  /**
   * Get banners for an event (public).
   */
  @Get(':id/banners')
  async getBanners(
    @Context() ctx: Ctx,
    @Param('id') eventId: string,
  ): Promise<ApiResponse<GetEventBannersResponse>> {
    const result = await this.eventsService.getBanners(ctx, eventId);
    return { success: true, data: result };
  }

  /**
   * Delete a banner from an event.
   * Only event creator or admin can delete.
   */
  @Delete(':id/banners/:type')
  @UseGuards(JwtAuthGuard)
  async deleteBanner(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') eventId: string,
    @Param('type') bannerType: string,
  ): Promise<ApiResponse<DeleteEventBannerResponse>> {
    if (bannerType !== 'square' && bannerType !== 'rectangle') {
      throw new BadRequestException('Banner type must be "square" or "rectangle"');
    }

    const result = await this.eventsService.deleteBanner(
      ctx,
      eventId,
      user.id,
      user.role,
      bannerType as EventBannerType,
    );

    return { success: true, data: result };
  }
}
