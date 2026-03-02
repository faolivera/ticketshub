import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse, ApiErrorDetails } from '../types/api';

/**
 * Interface for custom exceptions with structured error data.
 */
interface StructuredExceptionData {
  code?: string;
  message?: string;
  resource?: string;
  resourceId?: string;
  retryable?: boolean;
  [key: string]: unknown;
}

/**
 * Interface for custom exceptions that have a code property.
 */
interface CustomException extends HttpException {
  readonly code: string;
}

/**
 * Map of standard NestJS exception names to error codes.
 */
const STANDARD_EXCEPTION_CODES: Record<string, string> = {
  BadRequestException: 'BAD_REQUEST',
  UnauthorizedException: 'UNAUTHORIZED',
  ForbiddenException: 'FORBIDDEN',
  NotFoundException: 'NOT_FOUND',
  ConflictException: 'CONFLICT',
  GoneException: 'GONE',
  PayloadTooLargeException: 'PAYLOAD_TOO_LARGE',
  UnsupportedMediaTypeException: 'UNSUPPORTED_MEDIA_TYPE',
  UnprocessableEntityException: 'UNPROCESSABLE_ENTITY',
  InternalServerErrorException: 'INTERNAL_SERVER_ERROR',
  NotImplementedException: 'NOT_IMPLEMENTED',
  BadGatewayException: 'BAD_GATEWAY',
  ServiceUnavailableException: 'SERVICE_UNAVAILABLE',
  GatewayTimeoutException: 'GATEWAY_TIMEOUT',
  HttpVersionNotSupportedException: 'HTTP_VERSION_NOT_SUPPORTED',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, errorDetails } = this.extractErrorInfo(exception, request);

    this.logError(request, status, errorDetails.message, exception);

    const apiResponse: ApiResponse = {
      success: false,
      error: errorDetails,
    };

    response.status(status).json(apiResponse);
  }

  /**
   * Extract error information from the exception.
   */
  private extractErrorInfo(
    exception: unknown,
    request: Request,
  ): { status: number; errorDetails: ApiErrorDetails } {
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception);
    }

    this.logger.error(
      `Unexpected error: ${exception instanceof Error ? exception.message : String(exception)}`,
      exception instanceof Error ? exception.stack : undefined,
      `${request.method} ${request.url}`,
    );

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorDetails: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    };
  }

  /**
   * Handle HttpException and extract structured error data.
   */
  private handleHttpException(exception: HttpException): {
    status: number;
    errorDetails: ApiErrorDetails;
  } {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Check if this is a custom exception with a code property
    if (this.isCustomException(exception)) {
      return {
        status,
        errorDetails: this.extractCustomExceptionDetails(
          exception,
          exceptionResponse,
        ),
      };
    }

    // Handle standard NestJS exceptions
    return {
      status,
      errorDetails: this.extractStandardExceptionDetails(
        exception,
        exceptionResponse,
      ),
    };
  }

  /**
   * Check if exception is a custom exception with structured data.
   */
  private isCustomException(exception: HttpException): exception is CustomException {
    return 'code' in exception && typeof (exception as CustomException).code === 'string';
  }

  /**
   * Extract details from custom exceptions (OptimisticLockException, etc.).
   */
  private extractCustomExceptionDetails(
    exception: CustomException,
    exceptionResponse: string | object,
  ): ApiErrorDetails {
    const code = exception.code;
    let message = exception.message;
    const details: Record<string, unknown> = {};

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as StructuredExceptionData;

      if (responseObj.message) {
        message = responseObj.message;
      }

      // Extract known structured fields
      if (responseObj.resource !== undefined) {
        details.resource = responseObj.resource;
      }
      if (responseObj.resourceId !== undefined) {
        details.resourceId = responseObj.resourceId;
      }
      if (responseObj.retryable !== undefined) {
        details.retryable = responseObj.retryable;
      }

      // Extract additional context fields (exclude standard fields)
      const excludedFields = new Set([
        'message',
        'error',
        'code',
        'statusCode',
        'resource',
        'resourceId',
        'retryable',
      ]);

      for (const [key, value] of Object.entries(responseObj)) {
        if (!excludedFields.has(key)) {
          details[key] = value;
        }
      }
    }

    return {
      code,
      message,
      ...(Object.keys(details).length > 0 ? { details } : {}),
    };
  }

  /**
   * Extract details from standard NestJS exceptions.
   */
  private extractStandardExceptionDetails(
    exception: HttpException,
    exceptionResponse: string | object,
  ): ApiErrorDetails {
    const exceptionName = exception.constructor.name;
    const code =
      STANDARD_EXCEPTION_CODES[exceptionName] ||
      this.generateCodeFromName(exceptionName);

    let message: string;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const responseObj = exceptionResponse as { message?: string | string[] };
      const rawMessage = responseObj.message || exception.message;
      message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
    } else {
      message = exception.message;
    }

    return {
      code,
      message,
    };
  }

  /**
   * Generate an error code from exception class name.
   */
  private generateCodeFromName(name: string): string {
    return name
      .replace(/Exception$/, '')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toUpperCase();
  }

  /**
   * Log the error with appropriate level based on status code.
   */
  private logError(
    request: Request,
    status: number,
    message: string,
    exception: unknown,
  ): void {
    const logMessage = `${request.method} ${request.url} - Status: ${status} - Message: ${message}`;
    const trace = this.getStackTrace(exception);

    if (status >= 500) {
      this.logger.error(logMessage, trace);
    } else if (status >= 400) {
      this.logger.warn(logMessage, trace);
    }
  }

  /**
   * Get stack trace from exception, including cause if available.
   */
  private getStackTrace(exception: unknown): string | undefined {
    if (!(exception instanceof Error)) {
      return undefined;
    }

    const stackTrace = exception.stack;
    const cause = 'cause' in exception ? exception.cause : undefined;

    if (!cause) {
      return stackTrace;
    }

    if (cause instanceof Error) {
      return `${stackTrace}\n\nCaused by:\n${cause.stack || cause.message}`;
    }

    return `${stackTrace}\n\nCaused by: ${String(cause)}`;
  }
}
