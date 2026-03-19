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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Res,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Multer } from 'multer';
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
  AdminTransactionsResponse,
  AdminTransactionsPendingSummaryResponse,
  AdminTransactionDetailResponse,
  AdminUpdateTransactionRequest,
  AdminUserSearchResponse,
  AdminSellerPayoutsResponse,
  AdminCompletePayoutResponse,
  AdminSupportTicketsResponse,
  AdminSupportTicketDetailResponse,
  AdminUpdateSupportTicketStatusRequest,
  AdminUpdateSupportTicketStatusResponse,
  AdminResolveSupportDisputeRequest,
  AdminResolveSupportDisputeResponse,
  AdminAddSupportTicketMessageRequest,
  AdminAddSupportTicketMessageResponse,
  AdminDashboardMetricsResponse,
  AdminUsersResponse,
  AdminUserDetailResponse,
  AdminUpdateUserRequest,
  AdminUpdateUserResponse,
  ImportEventsPayload,
  ImportEventsPreviewResponse,
  ImportEventsValidationErrorResponse,
  ImportEventsResultResponse,
  AdminGetEventsRankingConfigResponse,
  AdminPatchEventsRankingConfigRequest,
  AdminPostEventsRankingQueueRequest,
  AdminPostEventsRankingQueueResponse,
  AdminSetFeaturedEventRequest,
  AdminSetFeaturedEventResponse,
} from './admin.api';
import type { EventWithDatesResponse } from '../events/events.api';
import {
  AdminPendingEventsResponseSchema,
  AdminUpdateEventResponseSchema,
  AdminApproveSectionResponseSchema,
  AdminAddSectionResponseSchema,
  AdminDeleteSectionResponseSchema,
  AdminUpdateSectionResponseSchema,
  AdminAllEventsResponseSchema,
  AdminEventListingsResponseSchema,
  AdminTransactionsResponseSchema,
  AdminTransactionsPendingSummaryResponseSchema,
  AdminTransactionDetailResponseSchema,
  AdminUserSearchResponseSchema,
  AdminSellerPayoutsResponseSchema,
  AdminCompletePayoutResponseSchema,
  AdminSupportTicketsResponseSchema,
  AdminSupportTicketDetailResponseSchema,
  AdminUpdateSupportTicketStatusResponseSchema,
  AdminResolveSupportDisputeResponseSchema,
  AdminAddSupportTicketMessageResponseSchema,
  AdminDashboardMetricsResponseSchema,
  AdminUsersResponseSchema,
  AdminUserDetailResponseSchema,
  AdminUpdateUserResponseSchema,
  ImportEventsPayloadSchema,
  ImportEventsPreviewResponseSchema,
  ImportEventsResultResponseSchema,
  AdminGetEventsRankingConfigResponseSchema,
  AdminPatchEventsRankingConfigRequestSchema,
  AdminPostEventsRankingQueueRequestSchema,
  AdminPostEventsRankingQueueResponseSchema,
  AdminSetFeaturedEventRequestSchema,
  AdminSetFeaturedEventResponseSchema,
} from './schemas/api.schemas';
import { CACHE_SERVICE, type ICacheService } from '../../common/cache';
import { HIGHLIGHTS_CACHE_KEY } from '../events/events.domain';
import { EventsService } from '../events/events.service';
import { EventScoringService } from '../event-scoring/event-scoring.service';
import { SeatingType } from '../tickets/tickets.domain';
import {
  BANNER_CONSTRAINTS,
  ALLOWED_BANNER_MIME_TYPES,
  type EventBannerType,
  type EventBannerMimeType,
} from '../events/events.domain';
import type {
  UploadEventBannerResponse,
  DeleteEventBannerResponse,
} from '../events/events.api';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class AdminController {
  constructor(
    @Inject(AdminService)
    private readonly adminService: AdminService,
    @Inject(EventsService)
    private readonly eventsService: EventsService,
    @Inject(EventScoringService)
    private readonly eventScoringService: EventScoringService,
    @Inject(CACHE_SERVICE)
    private readonly cache: ICacheService,
  ) {}

  /**
   * Get dashboard metrics (users, events, support tickets, pending counts).
   */
  @Get('dashboard-metrics')
  @ValidateResponse(AdminDashboardMetricsResponseSchema)
  async getDashboardMetrics(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<AdminDashboardMetricsResponse>> {
    const data = await this.adminService.getDashboardMetrics(ctx);
    return { success: true, data };
  }

  /**
   * Get event ranking config (weights and job cadence).
   */
  @Get('events-ranking/config')
  @ValidateResponse(AdminGetEventsRankingConfigResponseSchema)
  async getEventsRankingConfig(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<AdminGetEventsRankingConfigResponse>> {
    const data = await this.eventScoringService.getConfig(ctx);
    return { success: true, data };
  }

  /**
   * Update event ranking config (weights and/or job interval).
   */
  @Patch('events-ranking/config')
  @ValidateResponse(AdminGetEventsRankingConfigResponseSchema)
  async patchEventsRankingConfig(
    @Context() ctx: Ctx,
    @Body() body: AdminPatchEventsRankingConfigRequest,
  ): Promise<ApiResponse<AdminGetEventsRankingConfigResponse>> {
    const data = await this.eventScoringService.updateConfig(ctx, body);
    return { success: true, data };
  }

  /**
   * Enqueue one or more events for re-scoring. The job will process them asynchronously.
   */
  @Post('events-ranking/queue')
  @ValidateResponse(AdminPostEventsRankingQueueResponseSchema)
  async postEventsRankingQueue(
    @Context() ctx: Ctx,
    @Body() body: AdminPostEventsRankingQueueRequest,
  ): Promise<ApiResponse<AdminPostEventsRankingQueueResponse>> {
    const parsed = AdminPostEventsRankingQueueRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.flatten().fieldErrors?.eventIds?.[0] ?? 'Invalid request body',
      );
    }
    const data = await this.eventScoringService.requestScoringBatch(ctx, parsed.data.eventIds);
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
   * Get paginated transactions list with optional search.
   * Search supports transaction id, buyer email, seller email.
   */
  @Get('transactions')
  @ValidateResponse(AdminTransactionsResponseSchema)
  async getTransactions(
    @Context() ctx: Ctx,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse<AdminTransactionsResponse>> {
    const data = await this.adminService.getTransactionsList(ctx, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
    return { success: true, data };
  }

  /**
   * Get pending payment confirmations summary.
   * Route must be registered before /:id to avoid shadowing.
   */
  @Get('transactions/pending-summary')
  @ValidateResponse(AdminTransactionsPendingSummaryResponseSchema)
  async getTransactionsPendingSummary(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<AdminTransactionsPendingSummaryResponse>> {
    const data = await this.adminService.getTransactionsPendingSummary(ctx);
    return { success: true, data };
  }

  /**
   * List transactions in TransferringFund status for "pago a vendedores" (seller payouts).
   */
  @Get('seller-payouts')
  @ValidateResponse(AdminSellerPayoutsResponseSchema)
  async getSellerPayouts(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<AdminSellerPayoutsResponse>> {
    const data = await this.adminService.getSellerPayouts(ctx);
    return { success: true, data };
  }

  /**
   * Mark transaction payout as completed (release funds to seller, set Completed, notify seller).
   * Optional: upload payment receipt files (images or PDF) via multipart field "receipts".
   */
  @Post('transactions/:id/complete-payout')
  @UseInterceptors(
    FilesInterceptor('receipts', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'image/png',
          'image/jpeg',
          'image/jpg',
          'application/pdf',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Allowed: images (PNG, JPEG) or PDF',
            ),
            false,
          );
        }
      },
    }),
  )
  @ValidateResponse(AdminCompletePayoutResponseSchema)
  async completePayout(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @UploadedFiles() receipts?: Multer.File[],
  ): Promise<ApiResponse<AdminCompletePayoutResponse>> {
    const files =
      receipts
        ?.filter((f) => f?.buffer)
        ?.map((f) => ({
          buffer: f.buffer,
          originalname: f.originalname,
          mimetype: f.mimetype,
          size: f.size,
        })) ?? [];
    const data = await this.adminService.completePayout(
      ctx,
      id,
      user.id,
      files.length ? files : undefined,
    );
    return { success: true, data };
  }

  /**
   * Get transaction detail by ID.
   */
  @Get('transactions/:id')
  @ValidateResponse(AdminTransactionDetailResponseSchema)
  async getTransactionById(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<AdminTransactionDetailResponse>> {
    const data = await this.adminService.getTransactionById(ctx, id);
    return { success: true, data };
  }

  /**
   * Update transaction by ID (admin). All request body fields are optional.
   */
  @Patch('transactions/:id')
  @ValidateResponse(AdminTransactionDetailResponseSchema)
  async updateTransaction(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @Body() body: AdminUpdateTransactionRequest,
  ): Promise<ApiResponse<AdminTransactionDetailResponse>> {
    const data = await this.adminService.updateTransaction(ctx, id, body);
    return { success: true, data };
  }

  /**
   * Stream a payout receipt file for admin preview/download.
   * Route must be registered before /:id to avoid shadowing — not an issue here since
   * we use a nested path under /:id/payout-receipts.
   */
  @Get('transactions/:id/payout-receipts/:fileId/file')
  async getPayoutReceiptFile(
    @Context() ctx: Ctx,
    @Param('id') transactionId: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.adminService.getPayoutReceiptFileContent(
      ctx,
      transactionId,
      fileId,
    );
    if (!result) {
      throw new NotFoundException('Payout receipt file not found');
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${result.filename}"`,
    );
    res.send(result.buffer);
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
   * Get full event by ID (all fields). Use for admin/edit flows.
   * Public GET /api/events/:id returns a reduced, non-sensitive shape only.
   */
  @Get('events/:eventId')
  async getEvent(
    @Context() ctx: Ctx,
    @Param('eventId') eventId: string,
  ): Promise<ApiResponse<EventWithDatesResponse>> {
    const data = await this.adminService.getEvent(ctx, eventId);
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

  /**
   * Preview import events: validate payload and return preview with generated slugs (no persistence).
   * Returns validation errors in data when payload is invalid (still 200).
   */
  @Post('events/import/preview')
  async getImportPreview(
    @Context() ctx: Ctx,
    @Body() body: unknown,
  ): Promise<
    ApiResponse<
      ImportEventsPreviewResponse | ImportEventsValidationErrorResponse
    >
  > {
    const validation = this.adminService.validateImportEvents(body);
    if (validation.valid === false) {
      return {
        success: true,
        data: { valid: false, errors: validation.errors },
      };
    }
    const data = await this.adminService.getImportPreview(ctx, validation.data);
    return { success: true, data };
  }

  /**
   * Execute import: create events, dates, and sections (all approved). Validates payload first.
   */
  @Post('events/import')
  @ValidateResponse(ImportEventsResultResponseSchema)
  async executeImport(
    @Context() ctx: Ctx,
    @Body() body: unknown,
    @User('id') adminId: string,
  ): Promise<ApiResponse<ImportEventsResultResponse>> {
    const validation = this.adminService.validateImportEvents(body);
    if (validation.valid === false) {
      throw new BadRequestException({
        message: 'Import validation failed',
        errors: validation.errors,
      });
    }
    const data = await this.adminService.executeImport(
      ctx,
      validation.data,
      adminId,
    );
    return { success: true, data };
  }

  /**
   * Search users by email for autocomplete (e.g. when creating promotions).
   * Query param: q (min 2 characters). Returns id and email only.
   */
  @Get('users/search')
  @ValidateResponse(AdminUserSearchResponseSchema)
  async searchUsersByEmail(
    @Context() ctx: Ctx,
    @Query('q') q?: string,
  ): Promise<ApiResponse<AdminUserSearchResponse>> {
    const data = await this.adminService.searchUsersByEmail(ctx, q ?? '');
    return { success: true, data };
  }

  /**
   * Get paginated user list with optional search by name or email.
   */
  @Get('users')
  @ValidateResponse(AdminUsersResponseSchema)
  async getUsers(
    @Context() ctx: Ctx,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponse<AdminUsersResponse>> {
    const data = await this.adminService.getUsersList(ctx, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
    return { success: true, data };
  }

  /**
   * Get user detail for admin view/edit.
   */
  @Get('users/:id')
  @ValidateResponse(AdminUserDetailResponseSchema)
  async getUserById(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<AdminUserDetailResponse>> {
    const data = await this.adminService.getUserById(ctx, id);
    return { success: true, data };
  }

  /**
   * Update user (admin only). Allowed fields: firstName, lastName, publicName, email, role, status, phone, emailVerified, phoneVerified.
   */
  @Patch('users/:id')
  @ValidateResponse(AdminUpdateUserResponseSchema)
  async updateUser(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @Body() body: AdminUpdateUserRequest,
  ): Promise<ApiResponse<AdminUpdateUserResponse>> {
    const data = await this.adminService.updateUser(ctx, id, body);
    return { success: true, data };
  }

  // ==================== Support Tickets (Admin) ====================

  /**
   * List support tickets with pagination and optional filters.
   */
  @Get('support-tickets')
  @ValidateResponse(AdminSupportTicketsResponseSchema)
  async getSupportTickets(
    @Context() ctx: Ctx,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('source') source?: string,
  ): Promise<ApiResponse<AdminSupportTicketsResponse>> {
    const data = await this.adminService.getSupportTickets(ctx, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      category,
      source,
    });
    return { success: true, data };
  }

  /**
   * Get support ticket detail by ID (with messages).
   */
  @Get('support-tickets/:id')
  @ValidateResponse(AdminSupportTicketDetailResponseSchema)
  async getSupportTicketById(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
  ): Promise<ApiResponse<AdminSupportTicketDetailResponse>> {
    const data = await this.adminService.getSupportTicketById(ctx, id, user.id);
    return { success: true, data };
  }

  /**
   * Update support ticket status (admin).
   */
  @Patch('support-tickets/:id/status')
  @ValidateResponse(AdminUpdateSupportTicketStatusResponseSchema)
  async updateSupportTicketStatus(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @Body() body: AdminUpdateSupportTicketStatusRequest,
  ): Promise<ApiResponse<AdminUpdateSupportTicketStatusResponse>> {
    const data = await this.adminService.updateSupportTicketStatus(
      ctx,
      id,
      body.status,
    );
    return { success: true, data };
  }

  /**
   * Resolve a dispute ticket (admin only).
   */
  @Patch('support-tickets/:id/resolve')
  @ValidateResponse(AdminResolveSupportDisputeResponseSchema)
  async resolveSupportDispute(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @Body() body: AdminResolveSupportDisputeRequest,
  ): Promise<ApiResponse<AdminResolveSupportDisputeResponse>> {
    const data = await this.adminService.resolveSupportDispute(
      ctx,
      id,
      user.id,
      body,
    );
    return { success: true, data };
  }

  /**
   * Add admin reply to a support ticket.
   */
  @Post('support-tickets/:id/messages')
  @ValidateResponse(AdminAddSupportTicketMessageResponseSchema)
  async addSupportTicketMessage(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @Body() body: AdminAddSupportTicketMessageRequest,
  ): Promise<ApiResponse<AdminAddSupportTicketMessageResponse>> {
    const data = await this.adminService.addSupportTicketMessage(
      ctx,
      id,
      user.id,
      body,
    );
    return { success: true, data };
  }

  // ==================== Featured Events (Admin) ====================

  /**
   * Toggle the featured/highlighted status of an event.
   * Invalidates the GET /api/events/highlights cache so the landing hero reflects the change immediately.
   */
  @Patch('featured-events/:eventId')
  @ValidateResponse(AdminSetFeaturedEventResponseSchema)
  async setFeaturedEvent(
    @Context() ctx: Ctx,
    @Param('eventId') eventId: string,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: AdminSetFeaturedEventRequest,
  ): Promise<ApiResponse<AdminSetFeaturedEventResponse>> {
    const parsed = AdminSetFeaturedEventRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('highlighted must be a boolean');
    }

    await this.adminService.updateEventWithDates(
      ctx,
      eventId,
      { highlight: parsed.data.highlighted },
      user.id,
    );

    this.cache.invalidate(HIGHLIGHTS_CACHE_KEY);

    return {
      success: true,
      data: { eventId, highlighted: parsed.data.highlighted },
    };
  }

  // ==================== Event Banners (Admin) ====================

  /**
   * Admin upload/replace a banner for an event.
   */
  @Post('events/:id/banners/:type')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: BANNER_CONSTRAINTS.maxSizeBytes },
      fileFilter: (_req, file, cb) => {
        if (
          ALLOWED_BANNER_MIME_TYPES.includes(
            file.mimetype as EventBannerMimeType,
          )
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Allowed: PNG, JPEG, WebP',
            ),
            false,
          );
        }
      },
    }),
  )
  async adminUploadBanner(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') eventId: string,
    @Param('type') bannerType: string,
    @UploadedFile() file: Multer.File,
  ): Promise<ApiResponse<UploadEventBannerResponse>> {
    if (bannerType !== 'square' && bannerType !== 'rectangle' && bannerType !== 'og_image') {
      throw new BadRequestException(
        'Banner type must be "square", "rectangle", or "og_image"',
      );
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = await this.eventsService.uploadBanner(
      ctx,
      eventId,
      user.id,
      Role.Admin,
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
   * Admin delete a banner from an event.
   */
  @Delete('events/:id/banners/:type')
  async adminDeleteBanner(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') eventId: string,
    @Param('type') bannerType: string,
  ): Promise<ApiResponse<DeleteEventBannerResponse>> {
    if (bannerType !== 'square' && bannerType !== 'rectangle' && bannerType !== 'og_image') {
      throw new BadRequestException(
        'Banner type must be "square", "rectangle", or "og_image"',
      );
    }

    const result = await this.eventsService.deleteBanner(
      ctx,
      eventId,
      user.id,
      Role.Admin,
      bannerType as EventBannerType,
    );

    return { success: true, data: result };
  }
}
