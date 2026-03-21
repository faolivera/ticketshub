import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayPaymentsService } from './gateway-payments.service';
import { GatewayRefundsService } from './gateway-refunds.service';
import { GatewayPaymentsScheduler } from './gateway-payments.scheduler';
import { GatewayRefundsScheduler } from './gateway-refunds.scheduler';
import { GatewayWebhooksController } from './gateway-webhooks.controller';
import { GatewayOrdersRepository } from './gateway-orders.repository';
import { GATEWAY_ORDERS_REPOSITORY } from './gateway-orders.repository.interface';
import { GatewayRefundsRepository } from './gateway-refunds.repository';
import { GATEWAY_REFUNDS_REPOSITORY } from './gateway-refunds.repository.interface';
import { UalaBisProvider } from './providers/uala-bis.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import { PaymentsModule } from '../payments/payments.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { TransactionManagerModule } from '../../common/database';
import { DistributedLockModule } from '../../common/locks';
import { MetricsModule } from '../../common/metrics/metrics.module';

@Module({
  imports: [
    ConfigModule,
    TransactionManagerModule,
    DistributedLockModule,
    MetricsModule,
    PaymentsModule,
    forwardRef(() => TransactionsModule),
  ],
  controllers: [GatewayWebhooksController],
  providers: [
    GatewayPaymentsService,
    GatewayRefundsService,
    GatewayPaymentsScheduler,
    GatewayRefundsScheduler,
    UalaBisProvider,
    MercadoPagoProvider,
    { provide: GATEWAY_ORDERS_REPOSITORY, useClass: GatewayOrdersRepository },
    { provide: GATEWAY_REFUNDS_REPOSITORY, useClass: GatewayRefundsRepository },
  ],
  exports: [GatewayPaymentsService, GatewayRefundsService],
})
export class GatewaysModule {}
