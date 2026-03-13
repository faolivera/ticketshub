import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import {
  METRIC_HTTP_REQUEST_DURATION,
  METRIC_HTTP_REQUESTS_TOTAL,
} from './metrics.constants';

function getStatusClass(statusCode: number): string {
  if (statusCode >= 500) return '5xx';
  if (statusCode >= 400) return '4xx';
  if (statusCode >= 300) return '3xx';
  if (statusCode >= 200) return '2xx';
  return 'other';
}

/**
 * Interceptor that records per-endpoint HTTP metrics for Prometheus:
 * - Request duration (histogram)
 * - Request count (counter)
 * - Response status class 2xx, 3xx, 4xx, 5xx (counter labels)
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric(METRIC_HTTP_REQUEST_DURATION)
    private readonly requestDuration: Histogram<string>,
    @InjectMetric(METRIC_HTTP_REQUESTS_TOTAL)
    private readonly requestsTotal: Counter<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { route?: { path: string }; path?: string; url?: string; method: string }>();
    const response = http.getResponse<Response>();

    const method = request.method ?? 'GET';
    const path = request.route?.path ?? request.path ?? request.url ?? 'unknown';
    const startMs = Date.now();

    response.once('finish', () => {
      const statusClass = getStatusClass(response.statusCode);
      const durationMs = Date.now() - startMs;
      this.requestDuration.observe(
        { method, path, status_class: statusClass },
        durationMs,
      );
      this.requestsTotal.inc({ method, path, status_class: statusClass });
    });

    return next.handle();
  }
}
