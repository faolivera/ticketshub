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

/**
 * Sentinel code stored when using Twilio Verify (verification is done via API, not DB).
 */
export const OTP_CODE_TWILIO_PENDING = 'TWILIO';

/**
 * OTP entity
 */
export interface OTP {
  id: string;
  userId: string;
  type: OTPType;
  code: string;
  status: OTPStatus;
  expiresAt: Date;
  createdAt: Date;
  verifiedAt?: Date;
  /** Email or phone where the OTP was sent (for sending and for Twilio verify). */
  destination?: string;
}

/**
 * OTP configuration
 */
export const OTP_CONFIG = {
  /**
   * Length of the OTP code
   */
  codeLength: 6,

  /**
   * OTP expiration time in minutes
   */
  expirationMinutes: 10,

  /**
   * Maximum attempts before lockout
   */
  maxAttempts: 5,
};
