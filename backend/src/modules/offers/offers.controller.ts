import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type {
  CreateOfferRequest,
  CreateOfferResponse,
  ListOffersByListingResponse,
  ListMyOffersResponse,
  AcceptOfferResponse,
  RejectOfferResponse,
} from './offers.api';
import { CreateOfferRequestSchema } from './schemas/api.schemas';

@Controller('api/offers')
export class OffersController {
  constructor(
    @Inject(OffersService)
    private readonly offersService: OffersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOffer(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: unknown,
  ): Promise<ApiResponse<CreateOfferResponse>> {
    const parsed = CreateOfferRequestSchema.parse(body);
    const offer = await this.offersService.createOffer(ctx, user.id, parsed as CreateOfferRequest);
    return { success: true, data: offer };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async listMyOffers(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<ListMyOffersResponse>> {
    const offers = await this.offersService.listMyOffers(ctx, user.id);
    return { success: true, data: offers };
  }

  @Get('listing/:listingId')
  @UseGuards(JwtAuthGuard)
  async listOffersByListing(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('listingId') listingId: string,
  ): Promise<ApiResponse<ListOffersByListingResponse>> {
    const offers = await this.offersService.listOffersByListing(
      ctx,
      listingId,
      user.id,
    );
    return { success: true, data: offers };
  }

  @Post(':id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptOffer(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
  ): Promise<ApiResponse<AcceptOfferResponse>> {
    const offer = await this.offersService.acceptOffer(ctx, id, user.id);
    if (!offer) throw new NotFoundException('Offer not found');
    return { success: true, data: offer };
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectOffer(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('id') id: string,
  ): Promise<ApiResponse<RejectOfferResponse>> {
    const offer = await this.offersService.rejectOffer(ctx, id, user.id);
    if (!offer) throw new NotFoundException('Offer not found');
    return { success: true, data: offer };
  }
}
