import { Module, forwardRef } from '@nestjs/common';
import { OTPService } from './otp.service';
import { OTPRepository } from './otp.repository';
import { OTPController } from './otp.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [OTPController],
  providers: [OTPService, OTPRepository],
  exports: [OTPService],
})
export class OTPModule {}
