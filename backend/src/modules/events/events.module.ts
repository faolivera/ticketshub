import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { ImagesModule } from '../images/images.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [ImagesModule, UsersModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService],
})
export class EventsModule {}
