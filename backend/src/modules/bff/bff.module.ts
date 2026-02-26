import { Module } from '@nestjs/common';
import { BffController } from './bff.controller';
import { BffService } from './bff.service';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PaymentConfirmationsModule } from '../payment-confirmations/payment-confirmations.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    UsersModule,
    TransactionsModule,
    TicketsModule,
    ReviewsModule,
    PaymentConfirmationsModule,
    PaymentsModule,
  ],
  controllers: [BffController],
  providers: [BffService],
})
export class BffModule {}
