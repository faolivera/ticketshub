import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { BffService } from './bff.service';
import { Context } from '../../common/decorators/ctx.decorator';
import { User } from '../../common/decorators/user.decorator';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import type { ApiResponse } from '../../common/types/api';
import type { Ctx } from '../../common/types/context';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type {
  GetSellerProfileResponse,
  GetEventPageResponse,
  GetMyTicketsResponse,
  GetBuyPageResponse,
  GetCheckoutRiskResponse,
  GetTransactionDetailsResponse,
  GetSellTicketConfigResponse,
  ValidateSellListingRequest,
  ValidateSellListingResponse,
} from './bff.api';
import {
  GetSellerProfileResponseSchema,
  GetEventPageResponseSchema,
  GetMyTicketsResponseSchema,
  GetBuyPageResponseSchema,
  GetCheckoutRiskResponseSchema,
  GetTransactionDetailsResponseSchema,
  GetSellTicketConfigResponseSchema,
  ValidateSellListingResponseSchema,
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
   * Get sell-ticket page config: platform fee % and active promotion (authenticated)
   */
  @Get('sell-ticket/config')
  @UseGuards(JwtAuthGuard)
  @ValidateResponse(GetSellTicketConfigResponseSchema)
  async getSellTicketConfig(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<GetSellTicketConfigResponse>> {
    const data = await this.bffService.getSellTicketConfig(ctx, user.id);
    return { success: true, data };
  }

  /**
   * Validate whether the seller can create a listing from a risk perspective (Tier 0 limits).
   * Same checks as createListing; used by the sell wizard before advancing from the price step.
   */
  @Post('sell/validate')
  @UseGuards(JwtAuthGuard)
  @ValidateResponse(ValidateSellListingResponseSchema)
  async validateSellListing(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: ValidateSellListingRequest,
  ): Promise<ApiResponse<ValidateSellListingResponse>> {
    if (body.quantity < 1 || body.pricePerTicket?.amount < 0) {
      throw new BadRequestException('quantity and pricePerTicket.amount are required and must be valid');
    }
    const data = await this.bffService.validateSellListing(ctx, user.id, body);
    return { success: true, data };
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
   * Get buy page data: listing, seller info, and payment methods.
   * When authenticated, includes checkoutRisk for step-up verification UX.
   */
  @Get('buy/:ticketId')
  @UseGuards(OptionalJwtAuthGuard)
  @ValidateResponse(GetBuyPageResponseSchema)
  async getBuyPage(
    @Context() ctx: Ctx,
    @Param('ticketId') ticketId: string,
    @User() user?: { id: string },
  ): Promise<ApiResponse<GetBuyPageResponse>> {
    const data = await this.bffService.getBuyPageData(ctx, ticketId, user?.id);
    return { success: true, data };
  }

  /**
   * Re-evaluate checkout risk for the buy page (quantity + payment method).
   * Authenticated only. Use when user changes quantity or payment method to refresh requireV2/requireV3 and missing flags.
   */
  @Get('buy/:ticketId/checkout-risk')
  @UseGuards(JwtAuthGuard)
  @ValidateResponse(GetCheckoutRiskResponseSchema)
  async getCheckoutRisk(
    @Context() ctx: Ctx,
    @Param('ticketId') ticketId: string,
    @User() user: AuthenticatedUserPublicInfo,
    @Query('quantity', new DefaultValuePipe(1), ParseIntPipe) quantity: number,
    @Query('paymentMethodId') paymentMethodId: string,
  ): Promise<ApiResponse<GetCheckoutRiskResponse>> {
    const pmId = paymentMethodId?.trim();
    if (!pmId) {
      throw new BadRequestException('paymentMethodId is required');
    }
    const data = await this.bffService.getCheckoutRisk(
      ctx,
      ticketId,
      user.id,
      quantity,
      pmId,
    );
    return { success: true, data };
  }

  /**
   * Get event page data by slug: event details + enriched listings in a single call
   */
  @Get('event-page/:eventSlug')
  @ValidateResponse(GetEventPageResponseSchema)
  async getEventPage(
    @Context() ctx: Ctx,
    @Param('eventSlug') eventSlug: string,
  ): Promise<ApiResponse<GetEventPageResponse>> {
    const data = await this.bffService.getEventPageData(ctx, eventSlug);
    return { success: true, data };
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
