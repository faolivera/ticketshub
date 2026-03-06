import { Module } from '@nestjs/common';
import { RiskEngineService } from './risk-engine.service';
import { ConfigModule as PlatformConfigModule } from '../config/config.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PlatformConfigModule, UsersModule],
  providers: [RiskEngineService],
  exports: [RiskEngineService],
})
export class RiskEngineModule {}
