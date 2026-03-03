import { ConsoleLogger } from '@nestjs/common';
import { isLogLevelEnabled } from './log-level-resolver';

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
  }
}
