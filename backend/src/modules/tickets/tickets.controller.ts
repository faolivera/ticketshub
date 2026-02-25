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
  Inject,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { JWTPayload } from '../users/users.domain';
import type {
  CreateListingRequest,
  CreateListingResponse,
  UpdateListingRequest,
  UpdateListingResponse,
  GetListingResponse,
  ListListingsResponse,
  ListListingsQuery,
} from './tickets.api';
import { TicketType } from './tickets.domain';

@Controller('api/tickets')
export class TicketsController {
  constructor(
    @Inject(TicketsService)
    private readonly ticketsService: TicketsService,
  ) {}

  /**
   * Create a new listing
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createListing(
    @Context() ctx: Ctx,
    @User() user: JWTPayload,
    @Body() body: CreateListingRequest,
  ): Promise<ApiResponse<CreateListingResponse>> {
    const listing = await this.ticketsService.createListing(
      ctx,
      user.userId,
      user.level,
      body,
    );
    return { success: true, data: listing };
  }

  /**
   * List listings (public)
   */
  @Get()
  async listListings(
    @Context() ctx: Ctx,
    @Query('eventId') eventId?: string,
    @Query('eventDateId') eventDateId?: string,
    @Query('type') type?: TicketType,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ApiResponse<ListListingsResponse>> {
    const query: ListListingsQuery = {
      eventId,
      eventDateId,
      type,
      minPrice: minPrice ? parseInt(minPrice, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };
    const listings = await this.ticketsService.listListings(ctx, query);
    return { success: true, data: listings };
  }

  /**
   * Get listing by ID
   */
  @Get(':id')
  async getListing(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetListingResponse>> {
    const listing = await this.ticketsService.getListingById(ctx, id);
    return { success: true, data: listing };
  }

  /**
   * Update a listing
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateListing(
    @Context() ctx: Ctx,
    @User() user: JWTPayload,
    @Param('id') id: string,
    @Body() body: UpdateListingRequest,
  ): Promise<ApiResponse<UpdateListingResponse>> {
    const listing = await this.ticketsService.updateListing(
      ctx,
      id,
      user.userId,
      body,
    );
    return { success: true, data: listing };
  }

  /**
   * Cancel a listing
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancelListing(
    @Context() ctx: Ctx,
    @User() user: JWTPayload,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ cancelled: boolean }>> {
    await this.ticketsService.cancelListing(ctx, id, user.userId);
    return { success: true, data: { cancelled: true } };
  }
}
