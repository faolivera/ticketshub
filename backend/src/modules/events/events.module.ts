import { Module, forwardRef } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { EVENTS_REPOSITORY } from './events.repository.interface';
import { EventBannerStorageService } from './event-banner-storage.service';
import { ImagesModule } from '../images/images.module';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventScoringModule } from '../event-scoring/event-scoring.module';
import { CacheModule } from '../../common/cache';
import { ConfigModule } from '../config/config.module';
import { AddressModule } from '../address/address.module';

@Module({
  imports: [
    ImagesModule,
    UsersModule,
    forwardRef(() => TicketsModule),
    forwardRef(() => TransactionsModule),
    NotificationsModule,
    forwardRef(() => EventScoringModule),
    CacheModule,
    ConfigModule,
    AddressModule,
  ],
  controllers: [EventsController],
  providers: [
    EventsService,
    { provide: EVENTS_REPOSITORY, useClass: EventsRepository },
    EventBannerStorageService,
  ],
  exports: [EventsService, EVENTS_REPOSITORY],
})
export class EventsModule {}
