import { Logger } from '@nestjs/common';
import { Counter, register } from 'prom-client';
import { Ctx } from '../types/context';
import { isLogLevelEnabled } from './log-level-resolver';
import { isJsonMode, writeJsonLog } from './json-log';

const LOG_ERRORS_METRIC = 'log_errors_total';

let logErrorsCounter: Counter | undefined;

function getLogErrorsCounter(): Counter {
  if (!logErrorsCounter) {
    try {
      logErrorsCounter = new Counter({
        name: LOG_ERRORS_METRIC,
        help: 'Total number of error and fatal log entries emitted by the application',
        labelNames: ['level', 'context'],
      });
    } catch {
      // Already registered (e.g. across hot reloads or test runs); reuse from registry.
      logErrorsCounter = register.getSingleMetric(LOG_ERRORS_METRIC) as Counter;
    }
  }
  return logErrorsCounter;
}

/**
 * Wrapper around NestJS Logger that includes context information in log messages.
 * All methods receive `ctx` as the first argument to automatically include
 * request ID, user ID, and other contextual information in logs.
 * Respects global and per-context log levels from config (see logging in config/*.conf).
 */
export class ContextLogger {
  private readonly logger: Logger;
  private readonly contextName: string;

  constructor(context?: string) {
    this.contextName = context ?? 'ContextLogger';
    this.logger = context ? new Logger(context) : new Logger();
  }

  private formatContext(ctx: Ctx): string {
    if (ctx.method && ctx.path) {
      return `[${ctx.method} ${ctx.path}] `;
    }
    return '';
  }

  private ctxFields(ctx: Ctx): Record<string, unknown> {
    const fields: Record<string, unknown> = { source: ctx.source };
    if (ctx.requestId) fields.requestId = ctx.requestId;
    if (ctx.userId) fields.userId = ctx.userId;
    if (ctx.method) fields.method = ctx.method;
    if (ctx.path) fields.path = ctx.path;
    if (ctx.scheduledJobName) fields.scheduledJobName = ctx.scheduledJobName;
    return fields;
  }

  log(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.contextName, 'log')) return;
    if (isJsonMode()) { writeJsonLog('log', this.contextName, message, this.ctxFields(ctx)); return; }
    this.logger.log(`${this.formatContext(ctx)}${message}`, ...optionalParams);
  }

  error(ctx: Ctx, message: any, stack?: string, context?: string): void;
  error(ctx: Ctx, message: any, ...optionalParams: [...any, string?, string?]): void;
  error(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.contextName, 'error')) return;
    if (isJsonMode()) {
      const stack = optionalParams.find((p) => typeof p === 'string');
      writeJsonLog('error', this.contextName, message, { ...this.ctxFields(ctx), ...(stack && { stack }) });
      getLogErrorsCounter().inc({ level: 'error', context: this.contextName });
      return;
    }
    this.logger.error(`${this.formatContext(ctx)}${message}`, ...optionalParams);
    getLogErrorsCounter().inc({ level: 'error', context: this.contextName });
  }

  warn(ctx: Ctx, message: any, context?: string): void;
  warn(ctx: Ctx, message: any, ...optionalParams: [...any, string?]): void;
  warn(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.contextName, 'warn')) return;
    if (isJsonMode()) { writeJsonLog('warn', this.contextName, message, this.ctxFields(ctx)); return; }
    this.logger.warn(`${this.formatContext(ctx)}${message}`, ...optionalParams);
  }

  debug(ctx: Ctx, message: any, context?: string): void;
  debug(ctx: Ctx, message: any, ...optionalParams: [...any, string?]): void;
  debug(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.contextName, 'debug')) return;
    if (isJsonMode()) { writeJsonLog('debug', this.contextName, message, this.ctxFields(ctx)); return; }
    this.logger.debug(`${this.formatContext(ctx)}${message}`, ...optionalParams);
  }

  verbose(ctx: Ctx, message: any, context?: string): void;
  verbose(ctx: Ctx, message: any, ...optionalParams: [...any, string?]): void;
  verbose(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.contextName, 'verbose')) return;
    if (isJsonMode()) { writeJsonLog('verbose', this.contextName, message, this.ctxFields(ctx)); return; }
    this.logger.verbose(`${this.formatContext(ctx)}${message}`, ...optionalParams);
  }

  fatal(ctx: Ctx, message: any, context?: string): void;
  fatal(ctx: Ctx, message: any, ...optionalParams: [...any, string?]): void;
  fatal(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.contextName, 'fatal')) return;
    if (isJsonMode()) {
      writeJsonLog('fatal', this.contextName, message, this.ctxFields(ctx));
      getLogErrorsCounter().inc({ level: 'fatal', context: this.contextName });
      return;
    }
    this.logger.fatal(`${this.formatContext(ctx)}${message}`, ...optionalParams);
    getLogErrorsCounter().inc({ level: 'fatal', context: this.contextName });
  }
}
