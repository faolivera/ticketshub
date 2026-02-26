import { Controller, Get, Patch, Param, Body, Inject, UseGuards } from '@nestjs/common';
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
} from './admin.api';
import {
  AdminPaymentsResponseSchema,
  AdminPendingEventsResponseSchema,
  AdminUpdateEventResponseSchema,
} from './schemas/api.schemas';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class AdminController {
  constructor(
    @Inject(AdminService)
    private readonly adminService: AdminService,
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
}
