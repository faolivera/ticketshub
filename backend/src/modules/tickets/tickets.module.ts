import { Module, forwardRef } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from './tickets.repository';
import { TICKETS_REPOSITORY } from './tickets.repository.interface';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { TermsModule } from '../terms/terms.module';
import { ConfigModule } from '../config/config.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    forwardRef(() => EventsModule),
    UsersModule,
    PromotionsModule,
    TermsModule,
    ConfigModule,
    forwardRef(() => TransactionsModule),
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    { provide: TICKETS_REPOSITORY, useClass: TicketsRepository },
  ],
  exports: [TicketsService, TICKETS_REPOSITORY],
})
export class TicketsModule {}
