import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { WALLET_REPOSITORY } from './wallet.repository.interface';
import { UsersModule } from '../users/users.module';
import { TransactionManagerModule } from '../../common/database';

@Module({
  imports: [UsersModule, TransactionManagerModule],
  controllers: [WalletController],
  providers: [
    WalletService,
    {
      provide: WALLET_REPOSITORY,
      useClass: WalletRepository,
    },
  ],
  exports: [WalletService],
})
export class WalletModule {}
