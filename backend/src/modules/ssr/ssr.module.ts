import { Module } from '@nestjs/common';
import { BffModule } from '../bff/bff.module';
import { SsrController } from './ssr.controller';
import { SsrService } from './ssr.service';

@Module({
  imports: [BffModule],
  controllers: [SsrController],
  providers: [SsrService],
})
export class SsrModule {}
