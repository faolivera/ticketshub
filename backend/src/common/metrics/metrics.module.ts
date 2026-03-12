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

const HTTP_DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
const CRON_DURATION_BUCKETS = [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120];

@Module({
  imports: [PrometheusModule],
  providers: [
    makeHistogramProvider({
      name: METRIC_HTTP_REQUEST_DURATION,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status_class'],
      buckets: HTTP_DURATION_BUCKETS,
    }),
    makeCounterProvider({
      name: METRIC_HTTP_REQUESTS_TOTAL,
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status_class'],
    }),
    makeHistogramProvider({
      name: METRIC_CRON_JOB_DURATION,
      help: 'Scheduled job execution duration in seconds',
      labelNames: ['job_name'],
      buckets: CRON_DURATION_BUCKETS,
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
