import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  InternalServerErrorException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { ZodError } from 'zod';
import type { ZodTypeAny } from 'zod';
import { ApiResponse } from '../types/api';
import { VALIDATE_RESPONSE_KEY } from '../decorators/validate-response.decorator';

@Injectable()
export class ResponseValidationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const schema = this.reflector.get<ZodTypeAny>(
      VALIDATE_RESPONSE_KEY,
      context.getHandler(),
    );

    // If no schema defined, skip validation (for backwards compatibility)
    if (!schema) {
      return next.handle();
    }

    const controller = context.getClass();
    const handler = context.getHandler();
    const controllerName = controller.name;
    const methodName = handler.name;

    return next.handle().pipe(
      map((data: ApiResponse<any>) => {
        // Validate the data field of ApiResponse
        if (data && typeof data === 'object' && 'data' in data) {
          try {
            // Validate the data against the schema
            const validatedData = schema.parse(data.data);

            // Return with validated data
            return {
              ...data,
              data: validatedData,
            };
          } catch (error) {
            // If validation fails, log and throw InternalServerError
            if (error instanceof ZodError) {
              const errorMessage = `Response validation failed for ${controllerName}.${methodName}: ${error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;

              console.error(errorMessage);
              console.error(
                'Validation errors:',
                JSON.stringify(error.issues, null, 2),
              );
              console.error(
                'Received data:',
                JSON.stringify(data.data, null, 2),
              );

              throw new InternalServerErrorException({
                message: 'Response validation failed',
                errors: error.issues,
                path: `${controllerName}.${methodName}`,
              });
            }
            throw error;
          }
        }

        return data;
      }),
    );
  }
}
