import { Module } from '@nestjs/common';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { PlatformConfigModule } from './modules/config/config.module';
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

@Module({
  imports: [
    // Global modules (must be first)
    PlatformConfigModule,
    NotificationsModule,

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
    SupportModule,
    BffModule,
    TermsModule,
  ],
})
export class AppModule {}
