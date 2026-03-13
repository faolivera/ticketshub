/**
 * Prometheus metric names used by the application.
 * Centralized to avoid typos and allow reuse when injecting metrics.
 */
export const METRIC_HTTP_REQUEST_DURATION = 'http_request_duration_milliseconds';
export const METRIC_HTTP_REQUESTS_TOTAL = 'http_requests_total';
export const METRIC_CRON_JOB_DURATION = 'cron_job_duration_milliseconds';
export const METRIC_CRON_JOB_RUNS_TOTAL = 'cron_job_runs_total';
export const METRIC_LOG_ERRORS_TOTAL = 'log_errors_total';
