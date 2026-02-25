import { Module, forwardRef } from '@nestjs/common';
import { PaymentConfirmationsController } from './payment-confirmations.controller';
import { PaymentConfirmationsService } from './payment-confirmations.service';
import { PaymentConfirmationsRepository } from './payment-confirmations.repository';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    forwardRef(() => TransactionsModule),
    UsersModule,
    TicketsModule,
  ],
  controllers: [PaymentConfirmationsController],
  providers: [PaymentConfirmationsService, PaymentConfirmationsRepository],
  exports: [PaymentConfirmationsService],
})
export class PaymentConfirmationsModule {}
