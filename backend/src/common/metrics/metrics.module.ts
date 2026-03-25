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
  METRIC_EMAIL_SENDS_TOTAL,
  METRIC_SMS_SENDS_TOTAL,
  METRIC_OTP_SENDS_TOTAL,
  METRIC_OTP_VERIFICATIONS_TOTAL,
} from './metrics.constants';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';
import { CronMetricsService } from './cron-metrics.service';
import { OutboundMetricsService } from './outbound-metrics.service';

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
      labelNames: ['method', 'path', 'status'],
      buckets: HTTP_DURATION_BUCKETS_MS,
    }),
    makeCounterProvider({
      name: METRIC_HTTP_REQUESTS_TOTAL,
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
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
    makeCounterProvider({
      name: METRIC_EMAIL_SENDS_TOTAL,
      help: 'Total email send attempts',
      labelNames: ['success'],
    }),
    makeCounterProvider({
      name: METRIC_SMS_SENDS_TOTAL,
      help: 'Total SMS OTP send/check attempts',
      labelNames: ['operation', 'success'],
    }),
    makeCounterProvider({
      name: METRIC_OTP_SENDS_TOTAL,
      help: 'Total OTP send attempts at business level',
      labelNames: ['type', 'success'],
    }),
    makeCounterProvider({
      name: METRIC_OTP_VERIFICATIONS_TOTAL,
      help: 'Total OTP verification attempts',
      labelNames: ['type', 'result'],
    }),
    HttpMetricsInterceptor,
    CronMetricsService,
    OutboundMetricsService,
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
  ],
  exports: [CronMetricsService, OutboundMetricsService],
})
export class MetricsModule {}
