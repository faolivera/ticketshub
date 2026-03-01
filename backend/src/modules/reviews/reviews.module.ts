import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewsRepository } from './reviews.repository';
import { REVIEWS_REPOSITORY } from './reviews.repository.interface';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [TransactionsModule, UsersModule, TicketsModule],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    { provide: REVIEWS_REPOSITORY, useClass: ReviewsRepository },
  ],
  exports: [ReviewsService, REVIEWS_REPOSITORY],
})
export class ReviewsModule {}
