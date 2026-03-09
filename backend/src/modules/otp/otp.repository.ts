import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  Otp as PrismaOtp,
  OTPType as PrismaOTPType,
  OTPStatus as PrismaOTPStatus,
} from '@prisma/client';
import type { Ctx } from '../../common/types/context';
import { ContextLogger } from '../../common/logger/context-logger';
import type { OTP } from './otp.domain';
import { OTPType, OTPStatus } from './otp.domain';
import type { IOTPRepository } from './otp.repository.interface';

@Injectable()
export class OTPRepository implements IOTPRepository {
  private readonly logger = new ContextLogger(OTPRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(_ctx: Ctx, otp: OTP): Promise<OTP> {
    const created = await this.prisma.otp.create({
      data: {
        id: otp.id,
        userId: otp.userId,
        type: this.mapTypeToPrisma(otp.type),
        code: otp.code,
        status: this.mapStatusToPrisma(otp.status),
        expiresAt: otp.expiresAt,
        verifiedAt: otp.verifiedAt,
      },
    });
    return this.mapToOTP(created);
  }

  async findById(_ctx: Ctx, id: string): Promise<OTP | undefined> {
    const otp = await this.prisma.otp.findUnique({
      where: { id },
    });
    return otp ? this.mapToOTP(otp) : undefined;
  }

  async findLatestPendingByUserAndType(
    _ctx: Ctx,
    userId: string,
    type: OTPType,
  ): Promise<OTP | undefined> {
    const otp = await this.prisma.otp.findFirst({
      where: {
        userId,
        type: this.mapTypeToPrisma(type),
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    return otp ? this.mapToOTP(otp) : undefined;
  }

  async expireAllPendingByUserAndType(
    _ctx: Ctx,
    userId: string,
    type: OTPType,
  ): Promise<void> {
    await this.prisma.otp.updateMany({
      where: {
        userId,
        type: this.mapTypeToPrisma(type),
        status: 'pending',
      },
      data: {
        status: 'expired',
      },
    });
  }

  async updateStatus(
    _ctx: Ctx,
    id: string,
    status: OTPStatus,
  ): Promise<OTP | undefined> {
    try {
      const updated = await this.prisma.otp.update({
        where: { id },
        data: {
          status: this.mapStatusToPrisma(status),
          ...(status === OTPStatus.Verified && { verifiedAt: new Date() }),
        },
      });
      return this.mapToOTP(updated);
    } catch (error) {
      this.logger.error(_ctx, 'otp.repository updateStatus failed:', error);
      return undefined;
    }
  }

  async delete(_ctx: Ctx, id: string): Promise<void> {
    try {
      await this.prisma.otp.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.warn(
        _ctx,
        'otp.repository delete: not found or already deleted',
        error,
      );
    }
  }

  private mapToOTP(prismaOtp: PrismaOtp): OTP {
    return {
      id: prismaOtp.id,
      userId: prismaOtp.userId,
      type: this.mapTypeFromPrisma(prismaOtp.type),
      code: prismaOtp.code,
      status: this.mapStatusFromPrisma(prismaOtp.status),
      expiresAt: prismaOtp.expiresAt,
      createdAt: prismaOtp.createdAt,
      verifiedAt: prismaOtp.verifiedAt ?? undefined,
    };
  }

  private mapTypeToPrisma(type: OTPType): PrismaOTPType {
    switch (type) {
      case OTPType.EmailVerification:
        return 'email_verification';
      case OTPType.PhoneVerification:
        return 'phone_verification';
      default:
        return 'email_verification';
    }
  }

  private mapTypeFromPrisma(type: PrismaOTPType): OTPType {
    switch (type) {
      case 'email_verification':
        return OTPType.EmailVerification;
      case 'phone_verification':
        return OTPType.PhoneVerification;
      case 'password_reset':
        return OTPType.EmailVerification;
      default:
        return OTPType.EmailVerification;
    }
  }

  private mapStatusToPrisma(status: OTPStatus): PrismaOTPStatus {
    switch (status) {
      case OTPStatus.Pending:
        return 'pending';
      case OTPStatus.Verified:
        return 'verified';
      case OTPStatus.Expired:
        return 'expired';
      default:
        return 'pending';
    }
  }

  private mapStatusFromPrisma(status: PrismaOTPStatus): OTPStatus {
    switch (status) {
      case 'pending':
        return OTPStatus.Pending;
      case 'verified':
        return OTPStatus.Verified;
      case 'expired':
        return OTPStatus.Expired;
      default:
        return OTPStatus.Pending;
    }
  }
}
