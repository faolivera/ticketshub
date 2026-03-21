import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { PrismaModule } from './common/prisma/prisma.module';
import { MetricsModule } from './common/metrics/metrics.module';
import configuration from './config/configuration';
import { TransactionManagerModule } from './common/database';
import { DistributedLockModule } from './common/locks';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { OTPModule } from './modules/otp/otp.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventsModule } from './modules/events/events.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { SupportModule } from './modules/support/support.module';
import { BffModule } from './modules/bff/bff.module';
import { SsrModule } from './modules/ssr/ssr.module';
import { TermsModule } from './modules/terms/terms.module';
import { StorageModule } from './common/storage/storage.module';
import { EmailModule } from './common/email/email.module';
import { SmsModule } from './common/sms/sms.module';
import { PaymentConfirmationsModule } from './modules/payment-confirmations/payment-confirmations.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AdminModule } from './modules/admin/admin.module';
import { IdentityVerificationModule } from './modules/identity-verification/identity-verification.module';
import { ConfigModule as PlatformConfigModule } from './modules/config/config.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { OffersModule } from './modules/offers/offers.module';
import { TransactionChatModule } from './modules/transaction-chat/transaction-chat.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SocketModule } from './common/socket/socket.module';
import { RiskEngineModule } from './modules/risk-engine/risk-engine.module';
import { EventScoringModule } from './modules/event-scoring/event-scoring.module';
import { GatewaysModule } from './modules/gateways/gateways.module';

@Module({
  imports: [
    // Scheduling support for cron jobs
    ScheduleModule.forRoot(),

    // Global modules (must be first). ConfigModule before PrometheusModule so ConfigService is available for defaultLabels.
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      ignoreEnvFile: true,
    }),
    PrometheusModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        defaultLabels: {
          environment: configService.get<string>('app.environment') ?? 'dev',
        },
      }),
      inject: [ConfigService],
    }),
    MetricsModule,
    PrismaModule,
    TransactionManagerModule,
    DistributedLockModule,
    NotificationsModule,
    StorageModule,
    EmailModule,
    SmsModule,

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
    GatewaysModule,
    PaymentConfirmationsModule,
    IdentityVerificationModule,
    ReviewsModule,
    SupportModule,
    TermsModule,
    AdminModule,
    EventScoringModule,
    PlatformConfigModule,
    RiskEngineModule,
    PromotionsModule,
    OffersModule,
    TransactionChatModule,
    RealtimeModule,
    SocketModule,
    BffModule,
    SsrModule,
  ],
})
export class AppModule {}
