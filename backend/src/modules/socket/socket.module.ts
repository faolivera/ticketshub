import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { RealtimeModule } from '../realtime/realtime.module';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { TransactionChatModule } from '../transaction-chat/transaction-chat.module';

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
