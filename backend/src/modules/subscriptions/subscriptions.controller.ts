import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type { ApiResponse } from '../../common/types/api';
import { SubscriptionsService } from './subscriptions.service';
import type {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  GetSubscriptionCountResponse,
} from './subscriptions.api';

@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionsService)
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async subscribe(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo | undefined,
    @Body() body: CreateSubscriptionRequest,
  ): Promise<ApiResponse<CreateSubscriptionResponse>> {
    const result = await this.subscriptionsService.subscribe(
      ctx,
      user?.id ?? null,
      user?.email ?? null,
      body,
    );
    return { success: true, data: result };
  }

  @Get('count')
  async getCount(
    @Context() ctx: Ctx,
    @Query('eventId') eventId: string,
    @Query('subscriptionType') subscriptionType: string,
  ): Promise<ApiResponse<GetSubscriptionCountResponse>> {
    const result = await this.subscriptionsService.getCount(
      ctx,
      eventId,
      subscriptionType,
    );
    return { success: true, data: result };
  }
}
