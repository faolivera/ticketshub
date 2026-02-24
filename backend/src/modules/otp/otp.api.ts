import type { OTPType } from './otp.domain';

/**
 * Request to send OTP
 */
export interface SendOTPRequest {
  type: OTPType;
  target: string; // email or phone number
}

/**
 * Response after sending OTP
 */
export interface SendOTPResponse {
  message: string;
  expiresAt: Date;
}

/**
 * Request to verify OTP
 */
export interface VerifyOTPRequest {
  type: OTPType;
  code: string;
}

/**
 * Response after verifying OTP
 */
export interface VerifyOTPResponse {
  verified: boolean;
  message: string;
}
