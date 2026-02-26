import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Context } from '../../common/decorators/ctx.decorator';
import { User } from '../../common/decorators/user.decorator';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../users/users.domain';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type { ApiResponse } from '../../common/types/api';
import type { Ctx } from '../../common/types/context';
import type {
  AdminPaymentsResponse,
  AdminPendingEventsResponse,
  AdminUpdateEventRequest,
  AdminUpdateEventResponse,
  AdminApproveSectionRequest,
  AdminApproveSectionResponse,
  AdminAddSectionRequest,
  AdminAddSectionResponse,
  AdminDeleteSectionResponse,
  AdminUpdateSectionRequest,
  AdminUpdateSectionResponse,
  AdminAllEventsResponse,
  AdminEventListingsResponse,
} from './admin.api';
import {
  AdminPaymentsResponseSchema,
  AdminPendingEventsResponseSchema,
  AdminUpdateEventResponseSchema,
  AdminApproveSectionResponseSchema,
  AdminAddSectionResponseSchema,
  AdminDeleteSectionResponseSchema,
  AdminUpdateSectionResponseSchema,
  AdminAllEventsResponseSchema,
  AdminEventListingsResponseSchema,
} from './schemas/api.schemas';
import { EventsService } from '../events/events.service';
import { SeatingType } from '../tickets/tickets.domain';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class AdminController {
  constructor(
    @Inject(AdminService)
    private readonly adminService: AdminService,
    @Inject(EventsService)
    private readonly eventsService: EventsService,
  ) {}

  /**
   * Get enriched payment confirmations for admin approval page.
   * Returns pending confirmations with additional transaction details.
   */
  @Get('payments')
  @ValidateResponse(AdminPaymentsResponseSchema)
  async getAdminPayments(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<AdminPaymentsResponse>> {
    const data = await this.adminService.getAdminPayments(ctx);
    return { success: true, data };
  }

  /**
   * Get pending events and event dates for admin approval page.
   * Returns events with pending status or pending dates, along with listing counts.
   */
  @Get('events/pending')
  @ValidateResponse(AdminPendingEventsResponseSchema)
  async getPendingEvents(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<AdminPendingEventsResponse>> {
    const data = await this.adminService.getPendingEvents(ctx);
    return { success: true, data };
  }

  /**
   * Get all events with pagination and optional search filter.
   * Returns events with creator info and listing stats.
   */
  @Get('events/all')
  @ValidateResponse(AdminAllEventsResponseSchema)
  async getAllEvents(
    @Context() ctx: Ctx,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse<AdminAllEventsResponse>> {
    const data = await this.adminService.getAllEvents(ctx, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
    return { success: true, data };
  }

  /**
   * Get all ticket listings for a specific event.
   * Returns aggregated listing data with seller info, event date, and section.
   */
  @Get('events/:eventId/listings')
  @ValidateResponse(AdminEventListingsResponseSchema)
  async getEventListings(
    @Context() ctx: Ctx,
    @Param('eventId') eventId: string,
  ): Promise<ApiResponse<AdminEventListingsResponse>> {
    const data = await this.adminService.getEventListings(ctx, eventId);
    return { success: true, data };
  }

  /**
   * Update an event and its dates.
   * Allows updating event fields, adding/updating/deleting dates.
   */
  @Patch('events/:id')
  @ValidateResponse(AdminUpdateEventResponseSchema)
  async updateEvent(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @Body() body: AdminUpdateEventRequest,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<AdminUpdateEventResponse>> {
    const data = await this.adminService.updateEventWithDates(
      ctx,
      id,
      body,
      user.id,
    );
    return { success: true, data };
  }

  /**
   * Approve or reject an event section.
   */
  @Patch('events/sections/:id')
  @ValidateResponse(AdminApproveSectionResponseSchema)
  async approveSection(
    @Context() ctx: Ctx,
    @Param('id') sectionId: string,
    @User('id') adminId: string,
    @Body() body: AdminApproveSectionRequest,
  ): Promise<ApiResponse<AdminApproveSectionResponse>> {
    const section = await this.eventsService.approveEventSection(
      ctx,
      sectionId,
      adminId,
      body.approved,
      body.rejectionReason,
    );
    return {
      success: true,
      data: {
        id: section.id,
        eventId: section.eventId,
        name: section.name,
        seatingType: section.seatingType,
        status: section.status,
        approvedBy: section.approvedBy,
        rejectionReason: section.rejectionReason,
      },
    };
  }

  /**
   * Update an event section (name and/or seating type).
   */
  @Put('events/sections/:id')
  @ValidateResponse(AdminUpdateSectionResponseSchema)
  async updateSection(
    @Context() ctx: Ctx,
    @Param('id') sectionId: string,
    @Body() body: AdminUpdateSectionRequest,
  ): Promise<ApiResponse<AdminUpdateSectionResponse>> {
    const section = await this.eventsService.adminUpdateEventSection(
      ctx,
      sectionId,
      body,
    );
    return {
      success: true,
      data: {
        id: section.id,
        eventId: section.eventId,
        name: section.name,
        seatingType: section.seatingType,
        status: section.status,
        approvedBy: section.approvedBy,
        rejectionReason: section.rejectionReason,
        updatedAt: section.updatedAt,
      },
    };
  }

  /**
   * Add a section to an event (auto-approved when admin creates).
   */
  @Post('events/:eventId/sections')
  @ValidateResponse(AdminAddSectionResponseSchema)
  async addSection(
    @Context() ctx: Ctx,
    @Param('eventId') eventId: string,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: AdminAddSectionRequest,
  ): Promise<ApiResponse<AdminAddSectionResponse>> {
    const seatingType =
      body.seatingType === 'numbered'
        ? SeatingType.Numbered
        : SeatingType.Unnumbered;
    const section = await this.eventsService.addEventSection(
      ctx,
      eventId,
      user.id,
      Role.Admin,
      { name: body.name, seatingType },
    );
    return {
      success: true,
      data: {
        id: section.id,
        eventId: section.eventId,
        name: section.name,
        seatingType: section.seatingType,
        status: section.status,
        createdBy: section.createdBy,
        approvedBy: section.approvedBy!,
        createdAt: section.createdAt,
        updatedAt: section.updatedAt,
      },
    };
  }

  /**
   * Delete an event section.
   * Fails if section has any listings.
   */
  @Delete('events/sections/:id')
  @ValidateResponse(AdminDeleteSectionResponseSchema)
  async deleteSection(
    @Context() ctx: Ctx,
    @Param('id') sectionId: string,
  ): Promise<ApiResponse<AdminDeleteSectionResponse>> {
    await this.eventsService.deleteEventSection(ctx, sectionId);
    return {
      success: true,
      data: {
        success: true,
        message: 'Section deleted successfully',
      },
    };
  }
}
