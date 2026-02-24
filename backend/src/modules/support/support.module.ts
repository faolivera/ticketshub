import { Module } from '@nestjs/common';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportRepository } from './support.repository';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { EventsModule } from '../events/events.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ImagesModule } from '../images/images.module';
import { SupportSeedService } from './support-seed.service';

@Module({
  imports: [TransactionsModule, UsersModule, EventsModule, TicketsModule, ImagesModule],
  controllers: [SupportController],
  providers: [SupportService, SupportRepository, SupportSeedService],
  exports: [SupportService],
})
export class SupportModule {}
