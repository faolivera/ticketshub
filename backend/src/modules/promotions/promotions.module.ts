import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsClaimController } from './promotions-claim.controller';
import { PromotionsService } from './promotions.service';
import { PromotionCodesService } from './promotion-codes.service';
import { PromotionsRepository } from './promotions.repository';
import { PromotionCodesRepository } from './promotion-codes.repository';
import { PROMOTIONS_REPOSITORY } from './promotions.repository.interface';
import { PROMOTION_CODES_REPOSITORY } from './promotion-codes.repository.interface';
import { ConfigModule } from '../config/config.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [PromotionsController, PromotionsClaimController],
  providers: [
    {
      provide: PROMOTIONS_REPOSITORY,
      useClass: PromotionsRepository,
    },
    {
      provide: PROMOTION_CODES_REPOSITORY,
      useClass: PromotionCodesRepository,
    },
    PromotionsService,
    PromotionCodesService,
  ],
  exports: [PromotionsService, PromotionCodesService],
})
export class PromotionsModule {}
