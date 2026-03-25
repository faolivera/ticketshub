import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SUBSCRIPTIONS_REPOSITORY } from './subscriptions.repository.interface';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [EventsModule, UsersModule],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    { provide: SUBSCRIPTIONS_REPOSITORY, useClass: SubscriptionsRepository },
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
