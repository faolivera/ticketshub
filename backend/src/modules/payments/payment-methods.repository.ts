import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { PaymentMethod as PrismaPaymentMethod } from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type {
  PaymentMethodOption,
  PaymentMethodType,
  PaymentMethodStatus,
  PaymentGatewayProvider,
  BankTransferConfig,
} from './payments.domain';
import type { IPaymentMethodsRepository } from './payment-methods.repository.interface';

interface PaymentMethodInstructions {
  gatewayProvider?: PaymentGatewayProvider;
  gatewayConfigEnvPrefix?: string;
  bankTransferConfig?: BankTransferConfig;
  publicName?: string;
}

@Injectable()
export class PaymentMethodsRepository implements IPaymentMethodsRepository {
  private readonly logger = new ContextLogger(PaymentMethodsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(ctx: Ctx): Promise<PaymentMethodOption[]> {
    this.logger.debug(ctx, 'findAll');
    const methods = await this.prisma.paymentMethod.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return methods.map((m) => this.mapToDomain(m));
  }

  async findById(
    ctx: Ctx,
    id: string,
  ): Promise<PaymentMethodOption | undefined> {
    this.logger.debug(ctx, 'findById', { id });
    const method = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });
    return method ? this.mapToDomain(method) : undefined;
  }

  async findEnabled(ctx: Ctx): Promise<PaymentMethodOption[]> {
    this.logger.debug(ctx, 'findEnabled');
    const methods = await this.prisma.paymentMethod.findMany({
      where: { status: 'enabled' },
      orderBy: { createdAt: 'desc' },
    });
    return methods.map((m) => this.mapToDomain(m));
  }

  async create(
    _ctx: Ctx,
    paymentMethod: PaymentMethodOption,
  ): Promise<PaymentMethodOption> {
    this.logger.debug(_ctx, 'create', { id: paymentMethod.id });
    const instructions = this.buildInstructions(paymentMethod);

    const created = await this.prisma.paymentMethod.create({
      data: {
        id: paymentMethod.id,
        name: paymentMethod.name,
        type: paymentMethod.type,
        status: paymentMethod.status,
        commissionPercent: paymentMethod.buyerCommissionPercent ?? 0,
        commissionFixed: 0,
        instructions: instructions as object,
        requiredFields: [],
        createdAt: paymentMethod.createdAt,
        updatedAt: paymentMethod.updatedAt,
      },
    });
    return this.mapToDomain(created);
  }

  async update(
    _ctx: Ctx,
    id: string,
    updates: Partial<PaymentMethodOption>,
  ): Promise<PaymentMethodOption | undefined> {
    this.logger.debug(_ctx, 'update', { id });
    const existing = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });
    if (!existing) return undefined;

    const existingInstructions =
      (existing.instructions as PaymentMethodInstructions) || {};
    const newInstructions: PaymentMethodInstructions = {
      ...existingInstructions,
    };

    if (updates.gatewayProvider !== undefined) {
      newInstructions.gatewayProvider = updates.gatewayProvider;
    }
    if (updates.gatewayConfigEnvPrefix !== undefined) {
      newInstructions.gatewayConfigEnvPrefix = updates.gatewayConfigEnvPrefix;
    }
    if (updates.bankTransferConfig !== undefined) {
      newInstructions.bankTransferConfig = updates.bankTransferConfig;
    }
    if (updates.publicName !== undefined) {
      newInstructions.publicName = updates.publicName;
    }

    const updated = await this.prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.type !== undefined && { type: updates.type }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.buyerCommissionPercent !== undefined && {
          commissionPercent: updates.buyerCommissionPercent ?? 0,
        }),
        instructions: newInstructions as object,
        updatedAt: new Date(),
      },
    });
    return this.mapToDomain(updated);
  }

  async delete(_ctx: Ctx, id: string): Promise<boolean> {
    this.logger.debug(_ctx, 'delete', { id });
    const existing = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });
    if (!existing) return false;

    await this.prisma.paymentMethod.delete({
      where: { id },
    });
    return true;
  }

  private buildInstructions(
    paymentMethod: PaymentMethodOption,
  ): PaymentMethodInstructions {
    return {
      gatewayProvider: paymentMethod.gatewayProvider,
      gatewayConfigEnvPrefix: paymentMethod.gatewayConfigEnvPrefix,
      bankTransferConfig: paymentMethod.bankTransferConfig,
      publicName: paymentMethod.publicName,
    };
  }

  private mapToDomain(prismaMethod: PrismaPaymentMethod): PaymentMethodOption {
    const instructions =
      (prismaMethod.instructions as PaymentMethodInstructions) || {};

    return {
      id: prismaMethod.id,
      name: prismaMethod.name,
      publicName: instructions.publicName ?? prismaMethod.name,
      type: prismaMethod.type as PaymentMethodType,
      status: prismaMethod.status as PaymentMethodStatus,
      buyerCommissionPercent: prismaMethod.commissionPercent,
      gatewayProvider: instructions.gatewayProvider,
      gatewayConfigEnvPrefix: instructions.gatewayConfigEnvPrefix,
      bankTransferConfig: instructions.bankTransferConfig,
      createdAt: prismaMethod.createdAt,
      updatedAt: prismaMethod.updatedAt,
    };
  }
}
