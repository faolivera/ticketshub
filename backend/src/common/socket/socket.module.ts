import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { RealtimeModule } from '../../modules/realtime/realtime.module';
import { UsersModule } from '../../modules/users/users.module';
import { TransactionsModule } from '../../modules/transactions/transactions.module';
import { TransactionChatModule } from '../../modules/transaction-chat/transaction-chat.module';

@Module({
  imports: [
    RealtimeModule,
    UsersModule,
    TransactionsModule,
    TransactionChatModule,
  ],
  providers: [SocketGateway],
})
export class SocketModule {}
