import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentsService } from './payments.service';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentsRepository } from './payments.repository';
import { PaymentMethodsRepository } from './payment-methods.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [PaymentsController, PaymentMethodsController],
  providers: [
    PaymentsService,
    PaymentMethodsService,
    PaymentsRepository,
    PaymentMethodsRepository,
  ],
  exports: [PaymentsService, PaymentMethodsService],
})
export class PaymentsModule {}
