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

/**
 * Returns "2xx" for successful responses so they aggregate cleanly.
 * For 3xx, 4xx, and 5xx the exact code is returned (e.g. "301", "404", "500")
 * so they can be individually queried in Prometheus/Grafana.
 */
function getStatusLabel(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) return '2xx';
  return String(statusCode);
}

/**
 * Interceptor that records per-endpoint HTTP metrics for Prometheus:
 * - Request duration (histogram)
 * - Request count (counter)
 * - Response status: "2xx" for successes, exact code for 3xx/4xx/5xx
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
      const status = getStatusLabel(response.statusCode);
      const durationMs = Date.now() - startMs;
      this.requestDuration.observe(
        { method, path, status },
        durationMs,
      );
      this.requestsTotal.inc({ method, path, status });
    });

    return next.handle();
  }
}
