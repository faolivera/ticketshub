import { Module } from '@nestjs/common';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityVerificationRepository } from './identity-verification.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [IdentityVerificationController],
  providers: [IdentityVerificationService, IdentityVerificationRepository],
  exports: [IdentityVerificationService],
})
export class IdentityVerificationModule {}
