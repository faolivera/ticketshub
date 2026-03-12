import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import {
  METRIC_CRON_JOB_DURATION,
  METRIC_CRON_JOB_RUNS_TOTAL,
} from './metrics.constants';

/**
 * Service to wrap scheduled job execution and record Prometheus metrics:
 * - Job duration (histogram)
 * - Job runs total with success/failed (counter)
 *
 * Use run(jobName, fn) so every cron delegates to this instead of duplicating metrics logic.
 */
@Injectable()
export class CronMetricsService {
  constructor(
    @InjectMetric(METRIC_CRON_JOB_DURATION)
    private readonly jobDuration: Histogram<string>,
    @InjectMetric(METRIC_CRON_JOB_RUNS_TOTAL)
    private readonly jobRunsTotal: Counter<string>,
  ) {}

  async run<T>(jobName: string, fn: () => Promise<T>): Promise<T> {
    const endTimer = this.jobDuration.startTimer({ job_name: jobName });
    let success = true;
    try {
      const result = await fn();
      return result;
    } catch (err) {
      success = false;
      throw err;
    } finally {
      endTimer();
      this.jobRunsTotal.inc({ job_name: jobName, success: success ? 'true' : 'false' });
    }
  }
}
