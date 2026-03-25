/**
 * Prometheus metric names used by the application.
 * Centralized to avoid typos and allow reuse when injecting metrics.
 */
export const METRIC_HTTP_REQUEST_DURATION = 'http_request_duration_milliseconds';
export const METRIC_HTTP_REQUESTS_TOTAL = 'http_requests_total';
export const METRIC_CRON_JOB_DURATION = 'cron_job_duration_milliseconds';
export const METRIC_CRON_JOB_RUNS_TOTAL = 'cron_job_runs_total';
export const METRIC_LOG_ERRORS_TOTAL = 'log_errors_total';
export const METRIC_DB_QUERY_DURATION = 'db_query_duration_milliseconds';
export const METRIC_PG_POOL_CONNECTIONS_TOTAL = 'pg_pool_connections_total';
export const METRIC_PG_POOL_CONNECTIONS_IDLE = 'pg_pool_connections_idle';
export const METRIC_PG_POOL_CONNECTIONS_WAITING = 'pg_pool_connections_waiting';
export const METRIC_EMAIL_SENDS_TOTAL = 'email_sends_total';
export const METRIC_SMS_SENDS_TOTAL = 'sms_sends_total';
export const METRIC_OTP_SENDS_TOTAL = 'otp_sends_total';
export const METRIC_OTP_VERIFICATIONS_TOTAL = 'otp_verifications_total';
