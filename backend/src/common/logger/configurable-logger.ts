import { ConsoleLogger } from '@nestjs/common';
import { Counter, register } from 'prom-client';
import { isLogLevelEnabled } from './log-level-resolver';

const LOG_ERRORS_METRIC = 'log_errors_total';

function getLogErrorsCounter(): Counter {
  return register.getSingleMetric(LOG_ERRORS_METRIC) as Counter;
}

/**
 * Nest Logger that respects global and per-context log levels from config.
 * Set config at bootstrap via setLogLevelConfig(); then use for Nest system logging
 * via app.useLogger(new ConfigurableLogger()).
 */
export class ConfigurableLogger extends ConsoleLogger {
  private resolveContext(): string {
    return this.context ?? 'Nest';
  }

  log(message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.resolveContext(), 'log')) return;
    super.log(message, ...optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.resolveContext(), 'error')) return;
    super.error(message, ...optionalParams);
    getLogErrorsCounter()?.inc({ level: 'error', context: this.resolveContext() });
  }

  warn(message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.resolveContext(), 'warn')) return;
    super.warn(message, ...optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.resolveContext(), 'debug')) return;
    super.debug(message, ...optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.resolveContext(), 'verbose')) return;
    super.verbose(message, ...optionalParams);
  }

  fatal(message: any, ...optionalParams: any[]): void {
    if (!isLogLevelEnabled(this.resolveContext(), 'fatal')) return;
    super.fatal(message, ...optionalParams);
    getLogErrorsCounter()?.inc({ level: 'fatal', context: this.resolveContext() });
  }
}
