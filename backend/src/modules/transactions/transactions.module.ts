import { Module, forwardRef } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsScheduler } from './transactions.scheduler';
import { TicketsModule } from '../tickets/tickets.module';
import { PaymentsModule } from '../payments/payments.module';
import { WalletModule } from '../wallet/wallet.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    forwardRef(() => TicketsModule),
    PaymentsModule,
    WalletModule,
    UsersModule,
    forwardRef(() => EventsModule),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository, TransactionsScheduler],
  exports: [TransactionsService],
})
export class TransactionsModule {}
