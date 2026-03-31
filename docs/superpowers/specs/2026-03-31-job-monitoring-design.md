# Spec: Job Monitoring via Prometheus

**Date:** 2026-03-31
**Status:** Approved

## Context

Background schedulers (transaction expiry, email delivery, offer expiry, etc.) run silently. If they fail, there is no visibility until a user reports a symptom. The existing `/metrics` Prometheus endpoint and Grafana infrastructure are already in place — this spec adds job-level instrumentation to them.

## Scope

- Instrument all NestJS schedulers with Prometheus metrics (last run timestamp, success count, failure count)
- Expose via existing `/metrics` endpoint
- Grafana dashboard configuration (panel definitions)
- No admin UI changes

## Backend

### New service: `JobMetricsService`

**File:** `backend/src/modules/health/job-metrics.service.ts`

Singleton service that wraps `prom-client` counters and gauges. Provides two public methods:

```typescript
recordSuccess(jobName: string): void
recordFailure(jobName: string, error?: Error): void
```

**Metrics registered:**

```
# Gauge — Unix timestamp of last execution end (success or failure)
ticketshub_job_last_run_timestamp_seconds{job="<name>"}

# Counter — total successful runs
ticketshub_job_runs_total{job="<name>", status="success"}

# Counter — total failed runs
ticketshub_job_runs_total{job="<name>", status="failure"}
```

`JobMetricsService` is exported from `HealthModule` so schedulers can inject it.

### Jobs to instrument

| Job name (label) | Scheduler file |
|---|---|
| `transaction_expiry` | `transactions.scheduler.ts` |
| `admin_review_expiry` | `transactions.scheduler.ts` |
| `deposit_release` | `transactions.scheduler.ts` |
| `notification_processor` | `notifications.scheduler.ts` |
| `email_sender` | `notifications.scheduler.ts` |
| `email_retry` | `notifications.scheduler.ts` |
| `notification_cleanup` | `notifications.scheduler.ts` |
| `offer_expiry` | `offers.scheduler.ts` |
| `event_scoring` | `event-scoring.scheduler.ts` |
| `gateway_payment_processor` | `gateway-payments.scheduler.ts` |
| `gateway_refund_processor` | `gateway-refunds.scheduler.ts` |

### Instrumentation pattern

Each scheduler method wraps its body in try/catch and calls `JobMetricsService`:

```typescript
async runTransactionExpiry(): Promise<void> {
  try {
    // existing logic
    this.jobMetrics.recordSuccess('transaction_expiry');
  } catch (error) {
    this.jobMetrics.recordFailure('transaction_expiry', error);
    // existing error handling / logging unchanged
  }
}
```

`recordFailure` does NOT re-throw — error handling stays in the scheduler's existing catch block.

### Existing /metrics endpoint

No changes required to the endpoint itself. `prom-client`'s default registry picks up the new metrics automatically.

## Grafana

### Dashboard: "TicketsHub — Background Jobs"

**Panel 1 — Job health table (stat panel):**
One row per job. Green if `time() - last_run_timestamp < expected_interval * 2`, red otherwise.

Expected intervals per job:
| Job | Expected interval |
|---|---|
| `notification_processor` | 30s |
| `email_sender` | 45s |
| `offer_expiry` | 10m |
| `transaction_expiry` | 15m |
| `admin_review_expiry` | 30m |
| `deposit_release` | 30m |
| `email_retry` | 35m |
| `notification_cleanup` | 2h 5m |
| `event_scoring` | configurable |
| `gateway_payment_processor` | 5m |
| `gateway_refund_processor` | 5m |

**Panel 2 — Error rate (time series):**
`rate(ticketshub_job_runs_total{status="failure"}[5m])` per job label.

**Panel 3 — Last successful run (table):**
`ticketshub_job_last_run_timestamp_seconds` formatted as human-readable "X minutes ago".

### Alerts

Configure Grafana alerts for critical jobs:

| Job | Alert condition |
|---|---|
| `transaction_expiry` | No success in last 30 minutes |
| `deposit_release` | No success in last 60 minutes |
| `email_sender` | No success in last 2 minutes |
| `gateway_payment_processor` | No success in last 15 minutes |

Alert channel: existing notification channel in Grafana (not specified in this spec — configure in Grafana UI).

## Out of Scope

- Manual job triggering from UI
- Job execution duration metrics (can be added later)
- Per-job configuration of alert thresholds via admin panel
- Dead letter queue or automatic retry on job failure
