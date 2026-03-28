import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { OTPService } from '../../../../src/modules/otp/otp.service';
import { OTP_REPOSITORY } from '../../../../src/modules/otp/otp.repository.interface';
import type { IOTPRepository } from '../../../../src/modules/otp/otp.repository.interface';
import { EMAIL_SENDER } from '../../../../src/common/email/email-sender.interface';
import type { IEmailSender } from '../../../../src/common/email/email-sender.interface';
import { SMS_OTP_PROVIDER } from '../../../../src/common/sms/sms-otp-provider.interface';
import type { ISmsOtpProvider } from '../../../../src/common/sms/sms-otp-provider.interface';
import { OutboundMetricsService } from '../../../../src/common/metrics/outbound-metrics.service';
import type { Ctx } from '../../../../src/common/types/context';
import {
  OTPType,
  OTPStatus,
  OTP_CODE_TWILIO_PENDING,
} from '../../../../src/modules/otp/otp.domain';
import type { OTP } from '../../../../src/modules/otp/otp.domain';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-req' };

function createOTP(overrides: Partial<OTP> = {}): OTP {
  return {
    id: 'otp_1',
    userId: 'user_1',
    type: OTPType.EmailVerification,
    code: '111111',
    status: OTPStatus.Pending,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    createdAt: new Date(),
    attempts: 0,
    ...overrides,
  };
}

describe('OTPService', () => {
  let service: OTPService;
  let repository: jest.Mocked<IOTPRepository>;
  let configService: jest.Mocked<ConfigService>;
  let emailSender: jest.Mocked<IEmailSender>;
  let smsOtpProvider: jest.Mocked<ISmsOtpProvider>;
  let metrics: jest.Mocked<OutboundMetricsService>;

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findLatestPendingByUserAndType: jest.fn(),
      expireAllPendingByUserAndType: jest.fn(),
      updateStatus: jest.fn(),
      incrementAttempts: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
    };

    configService = {
      get: jest.fn((key: string) => {
        const map: Record<string, unknown> = {
          'otp.expirationMinutes': 10,
          'otp.maxAttempts': 5,
          'otp.codeLength': 6,
          'otp.emailProvider': 'MOCK_EMAIL',
          'otp.smsProvider': 'MOCK_SMS',
        };
        return map[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    emailSender = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_1' }),
    };

    smsOtpProvider = {
      startVerification: jest.fn().mockResolvedValue(undefined),
      checkVerification: jest.fn().mockResolvedValue(true),
    };

    metrics = {
      recordEmailSend: jest.fn(),
      recordSmsSend: jest.fn(),
      recordOtpSend: jest.fn(),
      recordOtpVerification: jest.fn(),
    } as unknown as jest.Mocked<OutboundMetricsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OTPService,
        { provide: OTP_REPOSITORY, useValue: repository },
        { provide: ConfigService, useValue: configService },
        { provide: EMAIL_SENDER, useValue: emailSender },
        { provide: SMS_OTP_PROVIDER, useValue: smsOtpProvider },
        { provide: OutboundMetricsService, useValue: metrics },
      ],
    }).compile();

    service = module.get(OTPService);
  });

  describe('sendOTP', () => {
    it('should create and send email OTP when type is EmailVerification', async () => {
      repository.create.mockImplementation((_, otp) =>
        Promise.resolve({ ...otp }),
      );

      const result = await service.sendOTP(
        mockCtx,
        'user_1',
        OTPType.EmailVerification,
        { email: 'u@example.com' },
      );

      expect(repository.expireAllPendingByUserAndType).toHaveBeenCalledWith(
        mockCtx,
        'user_1',
        OTPType.EmailVerification,
      );
      expect(repository.create).toHaveBeenCalled();
      expect(emailSender.send).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          to: 'u@example.com',
          subject: 'Tu código de verificación — TicketsHub',
          body: expect.stringContaining('111111'),
        }),
      );
      expect(result.type).toBe(OTPType.EmailVerification);
      expect(result.destination).toBe('u@example.com');
    });

    it('should throw when email send fails for EmailVerification', async () => {
      repository.create.mockImplementation((_, otp) =>
        Promise.resolve({ ...otp }),
      );
      emailSender.send.mockResolvedValue({
        success: false,
        error: 'SES error',
      });

      await expect(
        service.sendOTP(mockCtx, 'user_1', OTPType.EmailVerification, {
          email: 'u@example.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call SMS provider startVerification for PhoneVerification', async () => {
      repository.create.mockImplementation((_, otp) =>
        Promise.resolve({ ...otp }),
      );

      await service.sendOTP(mockCtx, 'user_1', OTPType.PhoneVerification, {
        phone: '+5491112345678',
      });

      expect(smsOtpProvider.startVerification).toHaveBeenCalledWith(
        mockCtx,
        '+5491112345678',
      );
      expect(repository.create).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          type: OTPType.PhoneVerification,
          destination: '+5491112345678',
        }),
      );
    });
  });

  describe('verifyOTP', () => {
    it('should verify when code matches stored code', async () => {
      const otp = createOTP({ code: '111111' });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);
      repository.updateStatus.mockImplementation((_, id, status) =>
        Promise.resolve({ ...otp, id, status }),
      );

      const result = await service.verifyOTP(
        mockCtx,
        'user_1',
        OTPType.EmailVerification,
        '111111',
      );

      expect(result).toBe(true);
      expect(repository.updateStatus).toHaveBeenCalledWith(
        mockCtx,
        otp.id,
        OTPStatus.Verified,
      );
    });

    it('should throw when no pending OTP', async () => {
      repository.findLatestPendingByUserAndType.mockResolvedValue(undefined);

      await expect(
        service.verifyOTP(mockCtx, 'user_1', OTPType.EmailVerification, '111111'),
      ).rejects.toThrow('No pending OTP found');
    });

    it('should throw when OTP expired', async () => {
      const otp = createOTP({
        expiresAt: new Date(Date.now() - 1000),
      });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);
      repository.updateStatus.mockResolvedValue(undefined);

      await expect(
        service.verifyOTP(mockCtx, 'user_1', OTPType.EmailVerification, '111111'),
      ).rejects.toThrow('OTP has expired');
    });

    it('should throw when code does not match', async () => {
      const otp = createOTP({ code: '111111' });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);

      await expect(
        service.verifyOTP(mockCtx, 'user_1', OTPType.EmailVerification, '999999'),
      ).rejects.toThrow('Invalid OTP code');
    });

    it('should increment attempts on failed email code verification', async () => {
      const otp = createOTP({ code: '111111', attempts: 0 });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);

      await expect(
        service.verifyOTP(mockCtx, 'user_1', OTPType.EmailVerification, '999999'),
      ).rejects.toThrow('Invalid OTP code');

      expect(repository.incrementAttempts).toHaveBeenCalledWith(mockCtx, otp.id);
    });

    it('should throw and expire OTP when max attempts reached for email', async () => {
      const otp = createOTP({ code: '111111', attempts: 5 });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);
      repository.updateStatus.mockResolvedValue(undefined);

      await expect(
        service.verifyOTP(mockCtx, 'user_1', OTPType.EmailVerification, '111111'),
      ).rejects.toThrow('Too many attempts');

      expect(repository.updateStatus).toHaveBeenCalledWith(
        mockCtx,
        otp.id,
        OTPStatus.Expired,
      );
      expect(repository.incrementAttempts).not.toHaveBeenCalled();
    });

    it('should use SMS provider checkVerification when code is TWILIO sentinel', async () => {
      const otp = createOTP({
        type: OTPType.PhoneVerification,
        code: OTP_CODE_TWILIO_PENDING,
        destination: '+5491112345678',
      });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);
      repository.updateStatus.mockImplementation((_, id, status) =>
        Promise.resolve({ ...otp, id, status }),
      );
      smsOtpProvider.checkVerification.mockResolvedValue(true);

      const result = await service.verifyOTP(
        mockCtx,
        'user_1',
        OTPType.PhoneVerification,
        '123456',
        '+5491112345678',
      );

      expect(result).toBe(true);
      expect(smsOtpProvider.checkVerification).toHaveBeenCalledWith(
        mockCtx,
        '+5491112345678',
        '123456',
      );
      expect(repository.updateStatus).toHaveBeenCalledWith(
        mockCtx,
        otp.id,
        OTPStatus.Verified,
      );
    });

    it('should throw when Twilio checkVerification returns false', async () => {
      const otp = createOTP({
        type: OTPType.PhoneVerification,
        code: OTP_CODE_TWILIO_PENDING,
        destination: '+5491112345678',
      });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);
      smsOtpProvider.checkVerification.mockResolvedValue(false);

      await expect(
        service.verifyOTP(
          mockCtx,
          'user_1',
          OTPType.PhoneVerification,
          'wrong',
          '+5491112345678',
        ),
      ).rejects.toThrow('Invalid OTP code');
    });

    it('should increment attempts on failed Twilio verification', async () => {
      const otp = createOTP({
        type: OTPType.PhoneVerification,
        code: OTP_CODE_TWILIO_PENDING,
        destination: '+5491112345678',
        attempts: 2,
      });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);
      smsOtpProvider.checkVerification.mockResolvedValue(false);

      await expect(
        service.verifyOTP(
          mockCtx,
          'user_1',
          OTPType.PhoneVerification,
          'wrong',
          '+5491112345678',
        ),
      ).rejects.toThrow('Invalid OTP code');

      expect(repository.incrementAttempts).toHaveBeenCalledWith(mockCtx, otp.id);
    });

    it('should throw and expire OTP when max attempts reached for Twilio SMS', async () => {
      const otp = createOTP({
        type: OTPType.PhoneVerification,
        code: OTP_CODE_TWILIO_PENDING,
        destination: '+5491112345678',
        attempts: 5,
      });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);
      repository.updateStatus.mockResolvedValue(undefined);

      await expect(
        service.verifyOTP(
          mockCtx,
          'user_1',
          OTPType.PhoneVerification,
          '123456',
          '+5491112345678',
        ),
      ).rejects.toThrow('Too many attempts');

      expect(repository.updateStatus).toHaveBeenCalledWith(
        mockCtx,
        otp.id,
        OTPStatus.Expired,
      );
      expect(smsOtpProvider.checkVerification).not.toHaveBeenCalled();
    });
  });

  describe('hasPendingOTP', () => {
    it('should return true when pending OTP exists and not expired', async () => {
      const otp = createOTP({
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      repository.findLatestPendingByUserAndType.mockResolvedValue(otp);

      const result = await service.hasPendingOTP(
        mockCtx,
        'user_1',
        OTPType.EmailVerification,
      );

      expect(result).toBe(true);
    });

    it('should return false when no pending OTP', async () => {
      repository.findLatestPendingByUserAndType.mockResolvedValue(undefined);

      const result = await service.hasPendingOTP(
        mockCtx,
        'user_1',
        OTPType.EmailVerification,
      );

      expect(result).toBe(false);
    });
  });
});
