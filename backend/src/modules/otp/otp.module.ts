import { Module } from '@nestjs/common';
import { OTPService } from './otp.service';
import { OTPRepository } from './otp.repository';

@Module({
  providers: [OTPService, OTPRepository],
  exports: [OTPService],
})
export class OTPModule {}
