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
import { SupportService } from './support.service';
import { SupportSeedService } from './support-seed.service';
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
  CreateSupportTicketRequest,
  CreateSupportTicketResponse,
  AddMessageRequest,
  AddMessageResponse,
  ResolveDisputeRequest,
  ResolveDisputeResponse,
  GetSupportTicketResponse,
  ListSupportTicketsResponse,
  ListSupportTicketsQuery,
  SeedDemoResponse,
} from './support.api';
import { SupportCategory, SupportTicketStatus } from './support.domain';

@Controller('api/support')
export class SupportController {
  constructor(
    @Inject(SupportService)
    private readonly supportService: SupportService,
    @Inject(SupportSeedService)
    private readonly supportSeedService: SupportSeedService,
  ) {}

  /**
   * Create a support ticket
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createTicket(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: CreateSupportTicketRequest,
  ): Promise<ApiResponse<CreateSupportTicketResponse>> {
    const ticket = await this.supportService.createTicket(
      ctx,
      user.id,
      body,
    );
    return { success: true, data: ticket };
  }

  /**
   * List my tickets
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async listTickets(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Query('status') status?: string,
    @Query('category') category?: SupportCategory,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ApiResponse<ListSupportTicketsResponse>> {
    const query: ListSupportTicketsQuery = {
      status,
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    const tickets = await this.supportService.listUserTickets(
      ctx,
      user.id,
      query,
    );
    return { success: true, data: tickets };
  }

  /**
   * Get ticket by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTicket(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetSupportTicketResponse>> {
    const ticket = await this.supportService.getTicketById(
      ctx,
      id,
      user.id,
      user.role,
    );
    return { success: true, data: ticket };
  }

  /**
   * Add message to ticket
   */
  @Post(':id/messages')
  @UseGuards(JwtAuthGuard)
  async addMessage(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') ticketId: string,
    @Body() body: AddMessageRequest,
  ): Promise<ApiResponse<AddMessageResponse>> {
    const isAdmin = user.role === Role.Admin;
    const message = await this.supportService.addMessage(
      ctx,
      ticketId,
      user.id,
      isAdmin,
      body.message,
      body.attachmentUrls,
    );
    return { success: true, data: { success: true, messageId: message.id } };
  }

  /**
   * Close ticket
   */
  @Post(':id/close')
  @UseGuards(JwtAuthGuard)
  async closeTicket(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ closed: boolean }>> {
    await this.supportService.closeTicket(ctx, id, user.id, user.role);
    return { success: true, data: { closed: true } };
  }

  /**
   * Resolve dispute (admin only)
   */
  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async resolveDispute(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
    @Body() body: ResolveDisputeRequest,
  ): Promise<ApiResponse<ResolveDisputeResponse>> {
    const ticket = await this.supportService.resolveDispute(
      ctx,
      id,
      user.id,
      body.resolution,
      body.resolutionNotes,
    );
    return { success: true, data: ticket };
  }

  /**
   * List all active tickets (admin only)
   */
  @Get('admin/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async listActiveTickets(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<ListSupportTicketsResponse>> {
    const tickets = await this.supportService.listActiveTickets(ctx);
    return { success: true, data: tickets };
  }

  /**
   * Update ticket status (admin only)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async updateStatus(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @Body() body: { status: SupportTicketStatus },
  ): Promise<ApiResponse<CreateSupportTicketResponse>> {
    const ticket = await this.supportService.updateTicketStatus(
      ctx,
      id,
      body.status,
    );
    return { success: true, data: ticket };
  }

  /**
   * Seed demo data for local testing (dev only)
   */
  @Post('dev/seed-demo')
  async seedDemo(@Context() ctx: Ctx): Promise<ApiResponse<SeedDemoResponse>> {
    const result = await this.supportSeedService.seedDemoData(ctx);
    return { success: true, data: result };
  }
}
