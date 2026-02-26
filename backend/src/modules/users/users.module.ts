import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ImagesModule } from '../images/images.module';
import { OTPModule } from '../otp/otp.module';
import { TermsModule } from '../terms/terms.module';

@Module({
  imports: [
    ImagesModule,
    forwardRef(() => OTPModule),
    forwardRef(() => TermsModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
