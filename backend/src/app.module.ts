import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [HealthModule, UsersModule],
})
export class AppModule {}

