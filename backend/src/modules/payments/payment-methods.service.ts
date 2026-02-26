import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PaymentMethodsRepository } from './payment-methods.repository';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  PaymentMethodOption,
  PublicPaymentMethodOption,
  PaymentGatewayProvider,
} from './payments.domain';
import type {
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
} from './payments.api';

export interface GatewayCredentials {
  accessToken?: string;
  publicKey?: string;
  secretKey?: string;
  authToken?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class PaymentMethodsService {
  private readonly logger = new ContextLogger(PaymentMethodsService.name);

  constructor(
    @Inject(PaymentMethodsRepository)
    private readonly repository: PaymentMethodsRepository,
  ) {}

  private generateId(): string {
    return `pm_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  async findAll(ctx: Ctx): Promise<PaymentMethodOption[]> {
    return await this.repository.findAll(ctx);
  }

  async findById(ctx: Ctx, id: string): Promise<PaymentMethodOption> {
    const method = await this.repository.findById(ctx, id);
    if (!method) {
      throw new NotFoundException(`Payment method ${id} not found`);
    }
    return method;
  }

  async findEnabled(ctx: Ctx): Promise<PaymentMethodOption[]> {
    return await this.repository.findEnabled(ctx);
  }

  async getPublicPaymentMethods(ctx: Ctx): Promise<PublicPaymentMethodOption[]> {
    const enabled = await this.repository.findEnabled(ctx);
    return enabled.map((pm) => ({
      id: pm.id,
      name: pm.publicName,
      type: pm.type,
      buyerCommissionPercent: pm.buyerCommissionPercent,
      bankTransferConfig: pm.bankTransferConfig,
    }));
  }

  async create(
    ctx: Ctx,
    data: CreatePaymentMethodRequest,
  ): Promise<PaymentMethodOption> {
    this.validatePaymentMethodData(data);

    const paymentMethod: PaymentMethodOption = {
      id: this.generateId(),
      name: data.name,
      publicName: data.publicName,
      type: data.type,
      status: 'enabled',
      buyerCommissionPercent: data.buyerCommissionPercent,
      gatewayProvider: data.gatewayProvider,
      gatewayConfigEnvPrefix: data.gatewayConfigEnvPrefix,
      bankTransferConfig: data.bankTransferConfig,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.repository.create(ctx, paymentMethod);
    this.logger.log(ctx, `Created payment method ${paymentMethod.id}`);
    return paymentMethod;
  }

  async update(
    ctx: Ctx,
    id: string,
    data: UpdatePaymentMethodRequest,
  ): Promise<PaymentMethodOption> {
    const existing = await this.findById(ctx, id);

    if (data.gatewayProvider !== undefined || data.bankTransferConfig !== undefined) {
      const merged = {
        type: existing.type,
        gatewayProvider: data.gatewayProvider ?? existing.gatewayProvider,
        bankTransferConfig: data.bankTransferConfig ?? existing.bankTransferConfig,
      };
      this.validatePaymentMethodData(merged as CreatePaymentMethodRequest);
    }

    const updated = await this.repository.update(ctx, id, data);
    if (!updated) {
      throw new NotFoundException(`Payment method ${id} not found`);
    }

    this.logger.log(ctx, `Updated payment method ${id}`);
    return updated;
  }

  async delete(ctx: Ctx, id: string): Promise<void> {
    const deleted = await this.repository.delete(ctx, id);
    if (!deleted) {
      throw new NotFoundException(`Payment method ${id} not found`);
    }
    this.logger.log(ctx, `Deleted payment method ${id}`);
  }

  async toggleStatus(
    ctx: Ctx,
    id: string,
    status: 'enabled' | 'disabled',
  ): Promise<PaymentMethodOption> {
    return await this.update(ctx, id, { status });
  }

  getGatewayCredentials(
    ctx: Ctx,
    paymentMethod: PaymentMethodOption,
  ): GatewayCredentials {
    if (paymentMethod.type !== 'payment_gateway') {
      throw new BadRequestException(
        'Cannot get gateway credentials for non-gateway payment method',
      );
    }

    const prefix = paymentMethod.gatewayConfigEnvPrefix;
    if (!prefix) {
      throw new BadRequestException(
        `Payment method ${paymentMethod.id} has no gateway config prefix`,
      );
    }

    const credentialKeys = this.getCredentialKeysForProvider(
      paymentMethod.gatewayProvider!,
    );

    const credentials: GatewayCredentials = {};
    for (const key of credentialKeys) {
      const envKey = `${prefix}_${key}`;
      credentials[this.camelCase(key)] = process.env[envKey];
    }

    this.logger.log(
      ctx,
      `Loaded credentials for ${paymentMethod.id} with prefix ${prefix}`,
    );
    return credentials;
  }

  private getCredentialKeysForProvider(
    provider: PaymentGatewayProvider,
  ): string[] {
    switch (provider) {
      case 'mercadopago':
        return ['ACCESS_TOKEN', 'PUBLIC_KEY'];
      case 'uala_bis':
        return ['AUTH_TOKEN'];
      case 'payway':
        return ['API_KEY', 'SECRET_KEY'];
      case 'astropay':
        return ['API_KEY', 'SECRET_KEY'];
      default:
        return [];
    }
  }

  private camelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private validatePaymentMethodData(
    data: Partial<CreatePaymentMethodRequest>,
  ): void {
    if (data.type === 'payment_gateway') {
      if (!data.gatewayProvider) {
        throw new BadRequestException(
          'Gateway provider is required for payment_gateway type',
        );
      }
      if (!data.gatewayConfigEnvPrefix) {
        throw new BadRequestException(
          'Gateway config env prefix is required for payment_gateway type',
        );
      }
    }

    if (data.type === 'manual_approval') {
      if (!data.bankTransferConfig) {
        throw new BadRequestException(
          'Bank transfer config is required for manual_approval type',
        );
      }
      const config = data.bankTransferConfig;
      if (!config.cbu || !config.accountHolderName || !config.bankName || !config.cuitCuil) {
        throw new BadRequestException(
          'Bank transfer config must include cbu, accountHolderName, bankName, and cuitCuil',
        );
      }
    }
  }
}
