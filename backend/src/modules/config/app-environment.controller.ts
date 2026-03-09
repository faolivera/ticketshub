import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import type { ApiResponse } from '../../common/types/api';
import type { GetAppEnvironmentResponse } from './config.api';
import { GetAppEnvironmentResponseSchema } from './schemas/api.schemas';

/**
 * Public controller for app-level config that the frontend needs without auth,
 * e.g. environment (prod/staging/dev) to decide whether to load analytics.
 */
@Controller('api/config')
export class AppEnvironmentController {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  @Get('app-environment')
  @ValidateResponse(GetAppEnvironmentResponseSchema)
  getAppEnvironment(): ApiResponse<GetAppEnvironmentResponse> {
    const environment = this.configService.get<string>('app.environment') ?? 'dev';
    const data: GetAppEnvironmentResponse = {
      environment: environment as GetAppEnvironmentResponse['environment'],
    };
    return { success: true, data };
  }
}
