import type { OTPType } from './otp.domain';

/**
 * Request to send OTP
 * For PhoneVerification, phoneNumber is required (validated as Argentina format).
 * Backend resolves email from authenticated user for email verification.
 */
export interface SendOTPRequest {
  type: OTPType;
  /** Required when type is PhoneVerification; validated as valid Argentina number. */
  phoneNumber?: string;
  target?: string;
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
  phoneNumber?: string;
}

/**
 * Response after verifying OTP
 */
export interface VerifyOTPResponse {
  verified: boolean;
  message: string;
}
