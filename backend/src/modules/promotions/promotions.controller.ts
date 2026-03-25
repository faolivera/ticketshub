import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Inject,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ThrottleAuthenticated } from '../../common/throttler';
import { PromotionsService } from './promotions.service';
import { PromotionCodesService } from './promotion-codes.service';
import { Context } from '../../common/decorators/ctx.decorator';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../users/users.domain';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type { ApiResponse } from '../../common/types/api';
import type { Ctx } from '../../common/types/context';
import type {
  CreatePromotionRequest,
  CreatePromotionResponse,
  ListPromotionsResponse,
  ListPromotionCodesResponse,
  CreatePromotionCodeRequest,
  UpdatePromotionCodeRequest,
  PromotionCodeListItem,
} from './promotions.api';
import {
  CreatePromotionRequestSchema,
  UpdatePromotionStatusRequestSchema,
  CreatePromotionCodeRequestSchema,
} from './schemas/api.schemas';
import { PromotionStatus, PromotionType } from './promotions.domain';

@ThrottleAuthenticated()
@Controller('api/admin/promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class PromotionsController {
  constructor(
    @Inject(PromotionsService)
    private readonly promotionsService: PromotionsService,
    @Inject(PromotionCodesService)
    private readonly promotionCodesService: PromotionCodesService,
  ) {}

  @Post()
  async create(
    @Context() ctx: Ctx,
    @Body() body: unknown,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<CreatePromotionResponse>> {
    const parsed = CreatePromotionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    const data = await this.promotionsService.create(
      ctx,
      parsed.data as CreatePromotionRequest,
      user.id,
    );
    return { success: true, data };
  }

  @Get()
  async list(
    @Context() ctx: Ctx,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('userId') userId?: string,
  ): Promise<ApiResponse<ListPromotionsResponse>> {
    const filters: {
      status?: PromotionStatus;
      type?: PromotionType;
      userId?: string;
    } = {};
    if (status) {
      filters.status =
        status === 'active' ? PromotionStatus.Active : PromotionStatus.Inactive;
    }
    if (
      type &&
      (type === 'SELLER_DISCOUNTED_FEE' || type === 'BUYER_DISCOUNTED_FEE')
    ) {
      filters.type = type as PromotionType;
    }
    if (userId) filters.userId = userId;
    const listFilters = Object.keys(filters).length > 0 ? filters : undefined;
    const data = await this.promotionsService.list(ctx, listFilters);
    return { success: true, data };
  }

  @Patch(':id/status')
  async updateStatus(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ApiResponse<{ status: string }>> {
    const parsed = UpdatePromotionStatusRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    const status =
      parsed.data.status === 'active'
        ? PromotionStatus.Active
        : PromotionStatus.Inactive;
    const updated = await this.promotionsService.updateStatus(ctx, id, {
      status,
    });
    return { success: true, data: { status: updated.status } };
  }

  @Get('promotion-codes')
  async listPromotionCodes(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<ListPromotionCodesResponse>> {
    const data = await this.promotionCodesService.listPromotionCodes(ctx);
    return { success: true, data };
  }

  @Post('promotion-codes')
  async createPromotionCode(
    @Context() ctx: Ctx,
    @Body() body: unknown,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<{ id: string; code: string }>> {
    const parsed = CreatePromotionCodeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    const data = await this.promotionCodesService.createPromotionCode(
      ctx,
      parsed.data as CreatePromotionCodeRequest,
      user.id,
    );
    return { success: true, data };
  }

  @Patch('promotion-codes/:id')
  async updatePromotionCode(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<ApiResponse<PromotionCodeListItem>> {
    const parsed = CreatePromotionCodeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    const data = await this.promotionCodesService.updatePromotionCode(
      ctx,
      id,
      parsed.data as UpdatePromotionCodeRequest,
    );
    return { success: true, data };
  }
}
