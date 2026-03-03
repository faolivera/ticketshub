import { Module } from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import { PlatformConfigService } from './config.service';
import { ConfigController } from './config.controller';
import { CONFIG_REPOSITORY } from './config.repository.interface';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [ConfigController],
  providers: [
    {
      provide: CONFIG_REPOSITORY,
      useClass: ConfigRepository,
    },
    PlatformConfigService,
  ],
  exports: [PlatformConfigService],
})
export class ConfigModule {}
