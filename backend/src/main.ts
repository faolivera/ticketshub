import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { ContextInterceptor } from './common/interceptors/context.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigurableLogger } from './common/logger/configurable-logger';
import { ContextLogger } from './common/logger/context-logger';
import { setLogLevelConfig } from './common/logger/log-level-resolver';
import { ON_APP_INIT_CTX } from './common/types/context';

/** Max JSON/urlencoded body size for import and other large payloads (e.g. admin events import). */
const BODY_PARSER_LIMIT = '10mb';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  app.use(json({ limit: BODY_PARSER_LIMIT }));
  app.use(urlencoded({ limit: BODY_PARSER_LIMIT, extended: true }));

  app.useWebSocketAdapter(new IoAdapter(app));

  const configService = app.get(ConfigService);
  const loggingConfig = configService.get<{
    level?: string;
    levels?: Record<string, string>;
  }>('logging');
  if (loggingConfig?.level) {
    setLogLevelConfig({
      level: loggingConfig.level,
      levels: loggingConfig.levels,
    });
  }
  app.useLogger(new ConfigurableLogger());

  const environment =
    configService.get<string>('app.environment') ?? 'dev';
  const logger = new ContextLogger('Bootstrap');
  logger.log(ON_APP_INIT_CTX, `Environment loaded: ${environment}`);

  // CORS: in production allow request origin (e.g. same host when Caddy serves frontend); in dev allow Vite
  const isProduction = configService.get<boolean>('app.isProduction') ?? false;
  app.enableCors({
    origin: isProduction ? true : 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalInterceptors(new ContextInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}
bootstrap();
