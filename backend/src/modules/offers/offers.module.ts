import { Module, forwardRef } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { OffersRepository } from './offers.repository';
import { OFFERS_REPOSITORY } from './offers.repository.interface';
import { TicketsModule } from '../tickets/tickets.module';
import { ConfigModule as PlatformConfigModule } from '../config/config.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    forwardRef(() => TicketsModule),
    PlatformConfigModule,
    UsersModule,
  ],
  controllers: [OffersController],
  providers: [
    OffersService,
    { provide: OFFERS_REPOSITORY, useClass: OffersRepository },
  ],
  exports: [OffersService],
})
export class OffersModule {}
