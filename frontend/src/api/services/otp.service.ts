import apiClient from '../client';
import type {
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
} from '../types';

/**
 * OTP service for phone/email verification
 */
export const otpService = {
  /**
   * Send OTP to email or phone
   */
  async sendOTP(data: SendOTPRequest): Promise<SendOTPResponse> {
    const response = await apiClient.post<SendOTPResponse>('/otp/send', data);
    return response.data;
  },

  /**
   * Verify OTP code
   */
  async verifyOTP(data: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    const response = await apiClient.post<VerifyOTPResponse>('/otp/verify', data);
    return response.data;
  },
};

export default otpService;
