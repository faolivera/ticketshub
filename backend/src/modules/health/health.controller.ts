import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service';

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return this.healthService.getHealth();
  }
}
