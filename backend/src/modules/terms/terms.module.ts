import { Module, forwardRef } from '@nestjs/common';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { TermsRepository } from './terms.repository';
import { TERMS_REPOSITORY } from './terms.repository.interface';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [TermsController],
  providers: [
    TermsService,
    {
      provide: TERMS_REPOSITORY,
      useClass: TermsRepository,
    },
  ],
  exports: [TermsService],
})
export class TermsModule {}
