import { Logger } from '@nestjs/common';
import { Ctx } from '../types/context';

/**
 * Wrapper around NestJS Logger that includes context information in log messages.
 * All methods receive `ctx` as the first argument to automatically include
 * request ID, user ID, and other contextual information in logs.
 */
export class ContextLogger {
  private readonly logger: Logger;

  constructor(context?: string) {
    this.logger = context ? new Logger(context) : new Logger();
  }

  /**
   * Format context information into a prefix string for log messages
   */
  private formatContext(ctx: Ctx): string {
    const parts: string[] = [];

    // if (ctx.requestId) {
    //   parts.push(`[reqId:${ctx.requestId}]`);
    // }

    // if (ctx.userId) {
    //   parts.push(`[userId:${ctx.userId}]`);
    // }

    if (ctx.method && ctx.path) {
      parts.push(`[${ctx.method} ${ctx.path}]`);
    }

    return parts.length > 0 ? `${parts.join(' ')} ` : '';
  }

  /**
   * Write a 'log' level log.
   */
  log(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    const contextPrefix = this.formatContext(ctx);
    const formattedMessage = `${contextPrefix}${message}`;
    this.logger.log(formattedMessage, ...optionalParams);
  }

  /**
   * Write an 'error' level log.
   */
  error(ctx: Ctx, message: any, stack?: string, context?: string): void;
  error(ctx: Ctx, message: any, ...optionalParams: [...any, string?, string?]): void;
  error(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    const contextPrefix = this.formatContext(ctx);
    const formattedMessage = `${contextPrefix}${message}`;
    this.logger.error(formattedMessage, ...optionalParams);
  }

  /**
   * Write a 'warn' level log.
   */
  warn(ctx: Ctx, message: any, context?: string): void;
  warn(ctx: Ctx, message: any, ...optionalParams: [...any, string?]): void;
  warn(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    const contextPrefix = this.formatContext(ctx);
    const formattedMessage = `${contextPrefix}${message}`;
    this.logger.warn(formattedMessage, ...optionalParams);
  }

  /**
   * Write a 'debug' level log.
   */
  debug(ctx: Ctx, message: any, context?: string): void;
  debug(ctx: Ctx, message: any, ...optionalParams: [...any, string?]): void;
  debug(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    const contextPrefix = this.formatContext(ctx);
    const formattedMessage = `${contextPrefix}${message}`;
    this.logger.debug(formattedMessage, ...optionalParams);
  }

  /**
   * Write a 'verbose' level log.
   */
  verbose(ctx: Ctx, message: any, context?: string): void;
  verbose(ctx: Ctx, message: any, ...optionalParams: [...any, string?]): void;
  verbose(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    const contextPrefix = this.formatContext(ctx);
    const formattedMessage = `${contextPrefix}${message}`;
    this.logger.verbose(formattedMessage, ...optionalParams);
  }

  /**
   * Write a 'fatal' level log.
   */
  fatal(ctx: Ctx, message: any, context?: string): void;
  fatal(ctx: Ctx, message: any, ...optionalParams: [...any, string?]): void;
  fatal(ctx: Ctx, message: any, ...optionalParams: any[]): void {
    const contextPrefix = this.formatContext(ctx);
    const formattedMessage = `${contextPrefix}${message}`;
    this.logger.fatal(formattedMessage, ...optionalParams);
  }
}

