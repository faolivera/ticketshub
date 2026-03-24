import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { IOTPRepository } from './otp.repository.interface';
import { OTP_REPOSITORY } from './otp.repository.interface';
import type { Ctx } from '../../common/types/context';
import type { OTP } from './otp.domain';
import {
  OTPType,
  OTPStatus,
  OTP_CODE_TWILIO_PENDING,
} from './otp.domain';
import type { IEmailSender } from '../../common/email/email-sender.interface';
import { EMAIL_SENDER } from '../../common/email/email-sender.interface';
import { wrapEmailHtml } from '../../common/email/email-wrapper';
import type { ISmsOtpProvider } from '../../common/sms/sms-otp-provider.interface';
import { SMS_OTP_PROVIDER } from '../../common/sms/sms-otp-provider.interface';
import { MOCK_SMS_OTP_CODE } from '../../common/sms/mock-sms-otp-provider';
import { ContextLogger } from '../../common/logger/context-logger';

/** Hardcoded code for mock email OTP (non-production). */
const MOCK_EMAIL_OTP_CODE = '111111';

export interface SendOTPOptions {
  email?: string;
  phone?: string;
}

@Injectable()
export class OTPService {
  private readonly logger = new ContextLogger(OTPService.name);

  constructor(
    @Inject(OTP_REPOSITORY)
    private readonly otpRepository: IOTPRepository,
    private readonly configService: ConfigService,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: IEmailSender,
    @Inject(SMS_OTP_PROVIDER)
    private readonly smsOtpProvider: ISmsOtpProvider,
  ) {}

  private isMockSms(): boolean {
    return (
      this.configService.get<string>('otp.smsProvider') === 'MOCK_SMS'
    );
  }

  /**
   * Generate OTP code: mock uses hardcoded 111111/222222; real uses random 6 digits.
   */
  private generateCode(type: OTPType): string {
    if (type === OTPType.PhoneVerification && !this.isMockSms()) {
      return OTP_CODE_TWILIO_PENDING;
    }
    if (type === OTPType.EmailVerification) {
      const provider =
        this.configService.get<string>('otp.emailProvider') ?? 'MOCK_EMAIL';
      if (provider === 'MOCK_EMAIL') return MOCK_EMAIL_OTP_CODE;
    }
    if (type === OTPType.PhoneVerification) {
      return MOCK_SMS_OTP_CODE;
    }
    const length = this.configService.get<number>('otp.codeLength') ?? 6;
    let digits = '';
    const bytes = randomBytes(length * 2);
    for (let i = 0; i < length; i++) {
      digits += (bytes.readUInt8(i) % 10).toString();
    }
    return digits;
  }

  private generateId(): string {
    return `otp_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Create and send OTP. Options must include email for EmailVerification and phone for PhoneVerification.
   */
  async sendOTP(
    ctx: Ctx,
    userId: string,
    type: OTPType,
    options?: SendOTPOptions,
  ): Promise<OTP> {
    await this.otpRepository.expireAllPendingByUserAndType(ctx, userId, type);

    const expirationMinutes =
      this.configService.get<number>('otp.expirationMinutes') ?? 10;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const code = this.generateCode(type);
    const destination =
      type === OTPType.EmailVerification
        ? options?.email
        : options?.phone;

    const otp: OTP = {
      id: this.generateId(),
      userId,
      type,
      code,
      status: OTPStatus.Pending,
      expiresAt,
      createdAt: new Date(),
      destination: destination ?? undefined,
    };

    await this.otpRepository.create(ctx, otp);

    if (type === OTPType.EmailVerification && destination) {
      const otpBodyHtml = `<div class="th-wrap">
  <div class="th-header">
    <span class="th-logo-text">Tickets<span>Hub</span></span>
  </div>
  <div class="th-body">
    <div class="th-icon th-icon--neutral">&#128274;</div>
    <h1 class="th-title">Tu código de verificación</h1>
    <p class="th-text">Ingresá el siguiente código para continuar. Es válido durante los próximos 10 minutos.</p>
    <div class="th-code-block">
      <div class="th-code">${code}</div>
      <span class="th-code-hint">Válido por 10 minutos · No lo compartás con nadie</span>
    </div>
    <div class="th-alert th-alert--warning">
      <p>Si no fuiste vos quien solicitó este código, ignorá este mensaje. Tu cuenta no fue afectada.</p>
    </div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`;
      const result = await this.emailSender.send(ctx, {
        to: destination,
        subject: 'Tu código de verificación — TicketsHub',
        body: `Tu código de verificación es: ${code}`,
        htmlBody: wrapEmailHtml(otpBodyHtml),
      });
      if (!result.success) {
        this.logger.error(
          ctx,
          `Failed to send OTP email to ${destination}: ${result.error}`,
        );
        throw new BadRequestException(
          'Failed to send verification email. Please try again.',
        );
      }
    }

    if (type === OTPType.PhoneVerification && destination) {
      await this.smsOtpProvider.startVerification(ctx, destination);
    }

    return otp;
  }

  /**
   * Verify OTP code. For Twilio SMS, verification is done via provider API; otherwise code is compared to stored value.
   */
  async verifyOTP(
    ctx: Ctx,
    userId: string,
    type: OTPType,
    code: string,
    phone?: string,
  ): Promise<boolean> {
    const otp = await this.otpRepository.findLatestPendingByUserAndType(
      ctx,
      userId,
      type,
    );

    if (!otp) {
      throw new BadRequestException(
        'No pending OTP found. Please request a new one.',
      );
    }

    if (new Date(otp.expiresAt) < new Date()) {
      await this.otpRepository.updateStatus(ctx, otp.id, OTPStatus.Expired);
      throw new BadRequestException(
        'OTP has expired. Please request a new one.',
      );
    }

    if (type === OTPType.PhoneVerification && otp.code === OTP_CODE_TWILIO_PENDING) {
      const verifyPhone = phone ?? otp.destination;
      if (!verifyPhone) {
        throw new BadRequestException(
          'Phone number is required for verification.',
        );
      }
      const valid = await this.smsOtpProvider.checkVerification(
        ctx,
        verifyPhone,
        code,
      );
      if (!valid) {
        throw new BadRequestException('Invalid OTP code.');
      }
    } else if (otp.code !== code) {
      throw new BadRequestException('Invalid OTP code.');
    }

    await this.otpRepository.updateStatus(ctx, otp.id, OTPStatus.Verified);
    return true;
  }

  /**
   * Check if user has a valid pending OTP
   */
  async hasPendingOTP(
    ctx: Ctx,
    userId: string,
    type: OTPType,
  ): Promise<boolean> {
    const otp = await this.otpRepository.findLatestPendingByUserAndType(
      ctx,
      userId,
      type,
    );
    return otp !== undefined && new Date(otp.expiresAt) > new Date();
  }
}
