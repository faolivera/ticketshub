import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { USERS_REPOSITORY } from './users.repository.interface';
import { ImagesModule } from '../images/images.module';
import { OTPModule } from '../otp/otp.module';
import { TermsModule } from '../terms/terms.module';
import { IdentityVerificationModule } from '../identity-verification/identity-verification.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ImagesModule,
    forwardRef(() => OTPModule),
    forwardRef(() => TermsModule),
    forwardRef(() => IdentityVerificationModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: USERS_REPOSITORY, useClass: UsersRepository },
  ],
  exports: [UsersService, USERS_REPOSITORY],
})
export class UsersModule {}
