import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PaymentConfirmationsModule } from '../payment-confirmations/payment-confirmations.module';
import { PaymentsModule } from '../payments/payments.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';
import { EventsModule } from '../events/events.module';
import { IdentityVerificationModule } from '../identity-verification/identity-verification.module';
import { SupportModule } from '../support/support.module';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EventScoringModule } from '../event-scoring/event-scoring.module';
import { CacheModule } from '../../common/cache';

@Module({
  imports: [
    PrismaModule,
    EventScoringModule,
    PaymentConfirmationsModule,
    PaymentsModule,
    TransactionsModule,
    UsersModule,
    TicketsModule,
    EventsModule,
    IdentityVerificationModule,
    SupportModule,
    CacheModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
