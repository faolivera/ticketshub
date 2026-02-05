import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../types/api';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle different response formats from HttpException
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.constructor.name.replace('Exception', '');
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.constructor.name.replace('Exception', '');
      } else {
        message = exception.message;
        error = exception.constructor.name.replace('Exception', '');
      }

      // Normalize message to string if it's an array
      if (Array.isArray(message)) {
        message = message.join(', ');
      }
    } else {
      // Handle unknown errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';

      // Log the full error for debugging
      this.logger.error(
        `Unexpected error: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
        `${request.method} ${request.url}`,
      );
    }

    // Log the error with appropriate level based on status code
    const logMessage = `${request.method} ${request.url} - Status: ${status} - Message: ${message}`;
    
    // Get stack trace or cause - check both the exception and its cause property
    let trace: string | undefined;
    
    if (exception instanceof Error) {
      const stackTrace = exception.stack;
      const cause = 'cause' in exception ? exception.cause : undefined;
      
      // Build trace information: include exception stack and cause if available
      if (cause) {
        if (cause instanceof Error) {
          // Combine exception stack with cause stack for full context
          trace = `${stackTrace}\n\nCaused by:\n${cause.stack || cause.message}`;
        } else {
          trace = `${stackTrace}\n\nCaused by: ${String(cause)}`;
        }
      } else {
        trace = stackTrace;
      }
    }

    if (status >= 500) {
      // Server errors - log as error with stack trace
      this.logger.error(logMessage, trace);
    } else if (status >= 400) {
      // Client errors - log as warn with stack trace
      this.logger.warn(logMessage, trace);
    }

    // Format response to match ApiResponse structure
    const apiResponse: ApiResponse = {
      success: false,
      error: message,
      message: error,
    };

    response.status(status).json(apiResponse);
  }
}

