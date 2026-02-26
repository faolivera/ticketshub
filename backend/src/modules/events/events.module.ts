import { Module, forwardRef } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventsRepository } from './events.repository';
import { ImagesModule } from '../images/images.module';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [ImagesModule, UsersModule, forwardRef(() => TicketsModule)],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService],
})
export class EventsModule {}
