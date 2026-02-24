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
