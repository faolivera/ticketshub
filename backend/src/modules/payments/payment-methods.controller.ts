import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../users/users.domain';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type {
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  GetPaymentMethodsResponse,
  GetPaymentMethodResponse,
} from './payments.api';

@Controller('api/admin/payment-methods')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class PaymentMethodsController {
  constructor(
    @Inject(PaymentMethodsService)
    private readonly paymentMethodsService: PaymentMethodsService,
  ) {}

  @Get()
  async list(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<GetPaymentMethodsResponse>> {
    const methods = await this.paymentMethodsService.findAll(ctx);
    return { success: true, data: methods };
  }

  @Get(':id')
  async getById(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<GetPaymentMethodResponse>> {
    const method = await this.paymentMethodsService.findById(ctx, id);
    return { success: true, data: method };
  }

  @Post()
  async create(
    @Context() ctx: Ctx,
    @Body() body: CreatePaymentMethodRequest,
  ): Promise<ApiResponse<GetPaymentMethodResponse>> {
    const method = await this.paymentMethodsService.create(ctx, body);
    return { success: true, data: method };
  }

  @Patch(':id')
  async update(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @Body() body: UpdatePaymentMethodRequest,
  ): Promise<ApiResponse<GetPaymentMethodResponse>> {
    const method = await this.paymentMethodsService.update(ctx, id, body);
    return { success: true, data: method };
  }

  @Patch(':id/toggle')
  async toggleStatus(
    @Context() ctx: Ctx,
    @Param('id') id: string,
    @Body() body: { status: 'enabled' | 'disabled' },
  ): Promise<ApiResponse<GetPaymentMethodResponse>> {
    const method = await this.paymentMethodsService.toggleStatus(
      ctx,
      id,
      body.status,
    );
    return { success: true, data: method };
  }

  @Delete(':id')
  async delete(
    @Context() ctx: Ctx,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.paymentMethodsService.delete(ctx, id);
    return { success: true, data: { deleted: true } };
  }
}
