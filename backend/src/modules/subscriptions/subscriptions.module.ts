import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SUBSCRIPTIONS_REPOSITORY } from './subscriptions.repository.interface';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    { provide: SUBSCRIPTIONS_REPOSITORY, useClass: SubscriptionsRepository },
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
