import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ContextInterceptor } from './common/interceptors/context.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigurableLogger } from './common/logger/configurable-logger';
import { setLogLevelConfig } from './common/logger/log-level-resolver';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const loggingConfig = configService.get<{ level?: string; levels?: Record<string, string> }>('logging');
  if (loggingConfig?.level) {
    setLogLevelConfig({
      level: loggingConfig.level,
      levels: loggingConfig.levels,
    });
  }
  app.useLogger(new ConfigurableLogger());

  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true,
  });

  app.useGlobalInterceptors(new ContextInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(3000);
}
bootstrap();
