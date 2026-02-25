import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ContextInterceptor } from './common/interceptors/context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend
  app.enableCors({
    origin: 'http://localhost:5173', // Vite default port
    credentials: true,
  });

  app.useGlobalInterceptors(new ContextInterceptor());

  await app.listen(3000);
}
bootstrap();
