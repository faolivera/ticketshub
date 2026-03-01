import { Module } from '@nestjs/common';
import { IdentityVerificationController } from './identity-verification.controller';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityVerificationRepository } from './identity-verification.repository';
import { IDENTITY_VERIFICATION_REPOSITORY } from './identity-verification.repository.interface';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [UsersModule, PrismaModule],
  controllers: [IdentityVerificationController],
  providers: [
    IdentityVerificationService,
    {
      provide: IDENTITY_VERIFICATION_REPOSITORY,
      useClass: IdentityVerificationRepository,
    },
  ],
  exports: [IdentityVerificationService],
})
export class IdentityVerificationModule {}
