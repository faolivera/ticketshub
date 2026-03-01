import { Module, forwardRef } from '@nestjs/common';
import { PaymentConfirmationsController } from './payment-confirmations.controller';
import { PaymentConfirmationsService } from './payment-confirmations.service';
import { PaymentConfirmationsRepository } from './payment-confirmations.repository';
import { PAYMENT_CONFIRMATIONS_REPOSITORY } from './payment-confirmations.repository.interface';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => TransactionsModule),
    UsersModule,
    TicketsModule,
  ],
  controllers: [PaymentConfirmationsController],
  providers: [
    PaymentConfirmationsService,
    {
      provide: PAYMENT_CONFIRMATIONS_REPOSITORY,
      useClass: PaymentConfirmationsRepository,
    },
  ],
  exports: [PaymentConfirmationsService],
})
export class PaymentConfirmationsModule {}
