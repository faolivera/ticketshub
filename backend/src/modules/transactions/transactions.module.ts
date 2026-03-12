import { Module, forwardRef } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { TRANSACTIONS_REPOSITORY } from './transactions.repository.interface';
import { TransactionsScheduler } from './transactions.scheduler';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentsModule } from '../payments/payments.module';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { ConfigModule } from '../config/config.module';
import { OffersModule } from '../offers/offers.module';
import { TransactionManagerModule } from '../../common/database';
import { MetricsModule } from '../../common/metrics/metrics.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { TermsModule } from '../terms/terms.module';
import { TransactionChatModule } from '../transaction-chat/transaction-chat.module';

@Module({
  imports: [
    TransactionManagerModule,
    MetricsModule,
    forwardRef(() => TicketsModule),
    PaymentsModule,
    WalletModule,
    UsersModule,
    forwardRef(() => EventsModule),
    ConfigModule,
    RiskEngineModule,
    TermsModule,
    OffersModule,
    forwardRef(() => TransactionChatModule),
  ],
  controllers: [TransactionsController],
  providers: [
    TransactionsService,
    TransactionsScheduler,
    {
      provide: TRANSACTIONS_REPOSITORY,
      useClass: TransactionsRepository,
    },
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
