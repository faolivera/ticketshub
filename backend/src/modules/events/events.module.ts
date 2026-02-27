import { Module, forwardRef } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { EventBannerStorageService } from './event-banner-storage.service';
import { ImagesModule } from '../images/images.module';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    ImagesModule,
    UsersModule,
    forwardRef(() => TicketsModule),
    forwardRef(() => TransactionsModule),
  ],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository, EventBannerStorageService],
  exports: [EventsService],
})
export class EventsModule {}
