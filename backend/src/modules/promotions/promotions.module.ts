import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PromotionsRepository } from './promotions.repository';
import { PROMOTIONS_REPOSITORY } from './promotions.repository.interface';
import { ConfigModule } from '../config/config.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [PromotionsController],
  providers: [
    {
      provide: PROMOTIONS_REPOSITORY,
      useClass: PromotionsRepository,
    },
    PromotionsService,
  ],
  exports: [PromotionsService],
})
export class PromotionsModule {}
