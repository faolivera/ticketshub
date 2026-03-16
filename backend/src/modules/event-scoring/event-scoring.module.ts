import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { DistributedLockModule } from '../../common/locks';
import { MetricsModule } from '../../common/metrics/metrics.module';
import { EventsModule } from '../events/events.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { EventScoringRepository } from './event-scoring.repository';
import { EventScoringService } from './event-scoring.service';
import { EventScoringScheduler } from './event-scoring.scheduler';

@Module({
  imports: [
    PrismaModule,
    DistributedLockModule,
    MetricsModule,
    forwardRef(() => EventsModule),
    forwardRef(() => TransactionsModule),
  ],
  providers: [EventScoringRepository, EventScoringService, EventScoringScheduler],
  exports: [EventScoringService],
})
export class EventScoringModule {}
