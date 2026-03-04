import { Module } from '@nestjs/common';
import { BffController } from './bff.controller';
import { BffService } from './bff.service';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { PaymentConfirmationsModule } from '../payment-confirmations/payment-confirmations.module';
import { PaymentsModule } from '../payments/payments.module';
import { ConfigModule } from '../config/config.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { TransactionChatModule } from '../transaction-chat/transaction-chat.module';

@Module({
  imports: [
    UsersModule,
    TransactionsModule,
    TransactionChatModule,
    TicketsModule,
    ReviewsModule,
    PaymentConfirmationsModule,
    PaymentsModule,
    ConfigModule,
    PromotionsModule,
  ],
  controllers: [BffController],
  providers: [BffService],
})
export class BffModule {}
