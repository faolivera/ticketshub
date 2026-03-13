import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import {
  METRIC_HTTP_REQUEST_DURATION,
  METRIC_HTTP_REQUESTS_TOTAL,
  METRIC_CRON_JOB_DURATION,
  METRIC_CRON_JOB_RUNS_TOTAL,
} from './metrics.constants';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { CronMetricsService } from './cron-metrics.service';

/** Buckets in ms: typical web API + Postgres (most requests < 1s, tail up to ~10s). Based on Prometheus default latency buckets. */
const HTTP_DURATION_BUCKETS_MS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
/** Buckets in ms: scheduled jobs from ~100ms to 2 minutes. */
const CRON_DURATION_BUCKETS_MS = [100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000, 120000];

@Module({
  imports: [PrometheusModule],
  providers: [
    makeHistogramProvider({
      name: METRIC_HTTP_REQUEST_DURATION,
      help: 'HTTP request duration in milliseconds',
      labelNames: ['method', 'path', 'status_class'],
      buckets: HTTP_DURATION_BUCKETS_MS,
    }),
    makeCounterProvider({
      name: METRIC_HTTP_REQUESTS_TOTAL,
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status_class'],
    }),
    makeHistogramProvider({
      name: METRIC_CRON_JOB_DURATION,
      help: 'Scheduled job execution duration in milliseconds',
      labelNames: ['job_name'],
      buckets: CRON_DURATION_BUCKETS_MS,
    }),
    makeCounterProvider({
      name: METRIC_CRON_JOB_RUNS_TOTAL,
      help: 'Total scheduled job runs',
      labelNames: ['job_name', 'success'],
    }),
    HttpMetricsInterceptor,
    CronMetricsService,
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
  exports: [CronMetricsService],
})
export class MetricsModule {}
