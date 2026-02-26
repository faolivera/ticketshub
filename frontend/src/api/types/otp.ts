/**
 * OTP (One-Time Password) type
 */
export enum OTPType {
  EmailVerification = 'EmailVerification',
  PhoneVerification = 'PhoneVerification',
}

/**
 * OTP status
 */
export enum OTPStatus {
  Pending = 'Pending',
  Verified = 'Verified',
  Expired = 'Expired',
}

// === API Types ===

/**
 * Request to send OTP
 * target is optional; backend resolves email/phone from authenticated user
 */
export interface SendOTPRequest {
  type: OTPType;
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
