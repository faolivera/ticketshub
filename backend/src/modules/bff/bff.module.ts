import { Module } from '@nestjs/common';
import { BffController } from './bff.controller';
import { BffService } from './bff.service';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [UsersModule, TransactionsModule, TicketsModule],
  controllers: [BffController],
  providers: [BffService],
})
export class BffModule {}
