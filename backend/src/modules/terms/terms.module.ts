import { Module, forwardRef } from '@nestjs/common';
import { TermsController } from './terms.controller';
import { TermsService } from './terms.service';
import { TermsRepository } from './terms.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  controllers: [TermsController],
  providers: [TermsService, TermsRepository],
  exports: [TermsService],
})
export class TermsModule {}
