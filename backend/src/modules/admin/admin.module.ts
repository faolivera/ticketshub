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

@Module({
  imports: [
    PrismaModule,
    PaymentConfirmationsModule,
    PaymentsModule,
    TransactionsModule,
    UsersModule,
    TicketsModule,
    EventsModule,
    IdentityVerificationModule,
    SupportModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
