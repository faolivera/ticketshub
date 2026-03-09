import { Module, forwardRef } from '@nestjs/common';
import { TransactionChatController } from './transaction-chat.controller';
import { TransactionChatService } from './transaction-chat.service';
import { TransactionChatRepository } from './transaction-chat.repository';
import {
  TRANSACTION_CHAT_REPOSITORY,
  type ITransactionChatRepository,
} from './transaction-chat.repository.interface';
import { TransactionsModule } from '../transactions/transactions.module';
import { ConfigModule } from '../config/config.module';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    forwardRef(() => TransactionsModule),
    ConfigModule,
    UsersModule,
    RealtimeModule,
  ],
  controllers: [TransactionChatController],
  providers: [
    TransactionChatService,
    {
      provide: TRANSACTION_CHAT_REPOSITORY,
      useClass: TransactionChatRepository,
    },
  ],
  exports: [TransactionChatService],
})
export class TransactionChatModule {}
