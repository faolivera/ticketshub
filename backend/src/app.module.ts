import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma/prisma.module';
import { TransactionManagerModule } from './common/database';
import { DistributedLockModule } from './common/locks';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import configuration from './config/configuration';
import { OTPModule } from './modules/otp/otp.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventsModule } from './modules/events/events.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { SupportModule } from './modules/support/support.module';
import { BffModule } from './modules/bff/bff.module';
import { TermsModule } from './modules/terms/terms.module';
import { StorageModule } from './common/storage/storage.module';
import { PaymentConfirmationsModule } from './modules/payment-confirmations/payment-confirmations.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AdminModule } from './modules/admin/admin.module';
import { IdentityVerificationModule } from './modules/identity-verification/identity-verification.module';

@Module({
  imports: [
    // Scheduling support for cron jobs
    ScheduleModule.forRoot(),

    // Global modules (must be first)
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      ignoreEnvFile: true,
    }),
    PrismaModule,
    TransactionManagerModule,
    DistributedLockModule,
    NotificationsModule,
    StorageModule,

    // Core modules
    HealthModule,
    UsersModule,
    OTPModule,

    // Business modules
    EventsModule,
    TicketsModule,
    WalletModule,
    PaymentsModule,
    TransactionsModule,
    PaymentConfirmationsModule,
    IdentityVerificationModule,
    ReviewsModule,
    SupportModule,
    BffModule,
    TermsModule,
    AdminModule,
  ],
})
export class AppModule {}
