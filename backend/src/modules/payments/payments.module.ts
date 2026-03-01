import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentsService } from './payments.service';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentsRepository } from './payments.repository';
import { PAYMENTS_REPOSITORY } from './payments.repository.interface';
import { PaymentMethodsRepository } from './payment-methods.repository';
import { PAYMENT_METHODS_REPOSITORY } from './payment-methods.repository.interface';
import { PricingService } from './pricing/pricing.service';
import { PricingRepository } from './pricing/pricing.repository';
import { PRICING_REPOSITORY } from './pricing/pricing.repository.interface';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [PaymentsController, PaymentMethodsController],
  providers: [
    PaymentsService,
    PaymentMethodsService,
    {
      provide: PAYMENTS_REPOSITORY,
      useClass: PaymentsRepository,
    },
    {
      provide: PAYMENT_METHODS_REPOSITORY,
      useClass: PaymentMethodsRepository,
    },
    PricingService,
    { provide: PRICING_REPOSITORY, useClass: PricingRepository },
  ],
  exports: [PaymentsService, PaymentMethodsService, PricingService],
})
export class PaymentsModule {}
