import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Ctx } from '../types/context';

/**
 * Decorator to inject the request context into controller methods
 * 
 * @example
 * ```typescript
 * @Get('example')
 * async example(@Context() ctx: Ctx) {
 *   console.log(ctx.requestId);
 * }
 * ```
 */
export const Context = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Ctx => {
    const request = ctx.switchToHttp().getRequest();
    // Return context if it exists, otherwise return a default HTTP context
    // (This should rarely happen as the interceptor should always set it)
    return request.ctx || { source: 'HTTP' };
  },
);

