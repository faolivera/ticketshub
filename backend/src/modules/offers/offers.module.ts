import { Module, forwardRef } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { OffersRepository } from './offers.repository';
import { OffersScheduler } from './offers.scheduler';
import { OFFERS_REPOSITORY } from './offers.repository.interface';
import { TicketsModule } from '../tickets/tickets.module';
import { ConfigModule as PlatformConfigModule } from '../config/config.module';
import { UsersModule } from '../users/users.module';
import { MetricsModule } from '../../common/metrics/metrics.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [forwardRef(() => TicketsModule), PlatformConfigModule, UsersModule, MetricsModule, forwardRef(() => EventsModule)],
  controllers: [OffersController],
  providers: [
    OffersService,
    OffersScheduler,
    { provide: OFFERS_REPOSITORY, useClass: OffersRepository },
  ],
  exports: [OffersService],
})
export class OffersModule {}
