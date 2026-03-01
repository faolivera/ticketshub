import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { WALLET_REPOSITORY } from './wallet.repository.interface';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
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
