import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { Ctx } from '../types/context';

/**
 * Interceptor that creates and attaches a context object to the request
 * The context can be accessed via the @Context() decorator in controllers
 */
@Injectable()
export class ContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Generate or use existing request ID
    const requestId =
      (request.headers['x-request-id'] as string) ||
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build context object
    const ctx: Ctx = {
      source: 'HTTP',
      requestId,
      timestamp: new Date(),
      method: request.method,
      path: request.path || request.url,
      userId: (request as any).user?.id, // Set by JwtAuthGuard if authenticated
      metadata: {},
    };

    // Attach context to request
    (request as any).ctx = ctx;

    return next.handle();
  }
}
