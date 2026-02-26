import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { BffService } from './bff.service';
import { Context } from '../../common/decorators/ctx.decorator';
import { User } from '../../common/decorators/user.decorator';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { ApiResponse } from '../../common/types/api';
import type { Ctx } from '../../common/types/context';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type {
  GetSellerProfileResponse,
  GetEventListingsResponse,
  GetMyTicketsResponse,
  GetBuyPageResponse,
  GetTransactionDetailsResponse,
} from './bff.api';
import {
  GetSellerProfileResponseSchema,
  GetEventListingsResponseSchema,
  GetMyTicketsResponseSchema,
  GetBuyPageResponseSchema,
  GetTransactionDetailsResponseSchema,
} from './schemas/api.schemas';

@Controller('api')
export class BffController {
  constructor(
    @Inject(BffService)
    private readonly bffService: BffService,
  ) {}

  /**
   * Get seller profile (BFF aggregation)
   */
  @Get('sellers/:id')
  @ValidateResponse(GetSellerProfileResponseSchema)
  async getSellerProfile(
    @Context() ctx: Ctx,
    @Param('id') sellerId: string,
  ): Promise<ApiResponse<GetSellerProfileResponse>> {
    const profile = await this.bffService.getSellerProfile(ctx, sellerId);
    return { success: true, data: profile };
  }

  /**
   * Get current user's tickets: bought, sold, and listed (authenticated)
   */
  @Get('my-tickets')
  @UseGuards(JwtAuthGuard)
  @ValidateResponse(GetMyTicketsResponseSchema)
  async getMyTickets(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<GetMyTicketsResponse>> {
    const data = await this.bffService.getMyTickets(ctx, user.id);
    return { success: true, data };
  }

  /**
   * Get buy page data: listing, seller info, and payment methods
   */
  @Get('buy/:ticketId')
  @ValidateResponse(GetBuyPageResponseSchema)
  async getBuyPage(
    @Context() ctx: Ctx,
    @Param('ticketId') ticketId: string,
  ): Promise<ApiResponse<GetBuyPageResponse>> {
    const data = await this.bffService.getBuyPageData(ctx, ticketId);
    return { success: true, data };
  }

  /**
   * Get event listings enriched with seller info (BFF aggregation)
   */
  @Get('listings')
  @ValidateResponse(GetEventListingsResponseSchema)
  async getEventListings(
    @Context() ctx: Ctx,
    @Query('eventId') eventId: string,
  ): Promise<ApiResponse<GetEventListingsResponse>> {
    if (!eventId) {
      throw new BadRequestException('eventId query parameter is required');
    }
    const listings = await this.bffService.getEventListings(ctx, eventId);
    return { success: true, data: listings };
  }

  /**
   * Get transaction details (BFF aggregation)
   * Combines transaction, payment confirmation, and reviews data.
   */
  @Get('transaction-details/:id')
  @UseGuards(JwtAuthGuard)
  @ValidateResponse(GetTransactionDetailsResponseSchema)
  async getTransactionDetails(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') transactionId: string,
  ): Promise<ApiResponse<GetTransactionDetailsResponse>> {
    const data = await this.bffService.getTransactionDetails(
      ctx,
      transactionId,
      user.id,
      user.role,
    );
    return { success: true, data };
  }
}
