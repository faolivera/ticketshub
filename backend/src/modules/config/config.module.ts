import { Module } from '@nestjs/common';
import { ConfigRepository } from './config.repository';
import { PlatformConfigService } from './config.service';
import { ConversionService } from './conversion.service';
import { AppEnvironmentController } from './app-environment.controller';
import { ConfigController } from './config.controller';
import { ConfigPublicController } from './config-public.controller';
import { CONFIG_REPOSITORY } from './config.repository.interface';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [
    AppEnvironmentController,
    ConfigController,
    ConfigPublicController,
  ],
  providers: [
    {
      provide: CONFIG_REPOSITORY,
      useClass: ConfigRepository,
    },
    PlatformConfigService,
    ConversionService,
  ],
  exports: [PlatformConfigService, ConversionService],
})
export class ConfigModule {}
