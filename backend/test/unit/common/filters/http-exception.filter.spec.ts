import {
  ArgumentsHost,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../../../../src/common/filters/http-exception.filter';
import { OptimisticLockException } from '../../../../src/common/exceptions/optimistic-lock.exception';
import { InsufficientFundsException } from '../../../../src/common/exceptions/insufficient-funds.exception';
import { ResourceConflictException } from '../../../../src/common/exceptions/resource-conflict.exception';
import { TicketNotAvailableException } from '../../../../src/common/exceptions/ticket-not-available.exception';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockRequest: {
    method: string;
    url: string;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      method: 'POST',
      url: '/api/test',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    } as unknown as ArgumentsHost;
  });

  describe('Custom Exceptions', () => {
    it('should return structured error for OptimisticLockException', () => {
      const exception = new OptimisticLockException(
        'TicketListing',
        'listing-123',
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'OPTIMISTIC_LOCK_CONFLICT',
          message:
            'The TicketListing was modified by another process. Please refresh and try again.',
          details: {
            resource: 'TicketListing',
            resourceId: 'listing-123',
            retryable: true,
          },
        },
      });
    });

    it('should return structured error for InsufficientFundsException', () => {
      const exception = new InsufficientFundsException(50, 100);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds. Available: 50, Required: 100',
          details: {
            available: 50,
            required: 100,
            retryable: false,
          },
        },
      });
    });

    it('should return structured error for ResourceConflictException', () => {
      const exception = new ResourceConflictException(
        'Wallet',
        'Wallet is locked for processing',
        'wallet-456',
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'RESOURCE_CONFLICT',
          message: 'Wallet is locked for processing',
          details: {
            resource: 'Wallet',
            resourceId: 'wallet-456',
            retryable: true,
          },
        },
      });
    });

    it('should return structured error for TicketNotAvailableException', () => {
      const exception = new TicketNotAvailableException('listing-789', 5, 2);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TICKET_NOT_AVAILABLE',
          message: 'Not enough tickets available. Requested: 5, Available: 2',
          details: {
            listingId: 'listing-789',
            requestedQuantity: 5,
            availableQuantity: 2,
            retryable: true,
          },
        },
      });
    });
  });

  describe('Standard NestJS Exceptions', () => {
    it('should return BAD_REQUEST code for BadRequestException', () => {
      const exception = new BadRequestException('Invalid input data');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid input data',
        },
      });
    });

    it('should return NOT_FOUND code for NotFoundException', () => {
      const exception = new NotFoundException('User not found');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
    });

    it('should return FORBIDDEN code for ForbiddenException', () => {
      const exception = new ForbiddenException('Access denied');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
        },
      });
    });

    it('should return UNAUTHORIZED code for UnauthorizedException', () => {
      const exception = new UnauthorizedException('Invalid token');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
        },
      });
    });

    it('should return CONFLICT code for ConflictException', () => {
      const exception = new ConflictException('Resource already exists');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
        },
      });
    });

    it('should handle BadRequestException with array of messages', () => {
      const exception = new BadRequestException({
        message: ['email must be valid', 'password is required'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'email must be valid, password is required',
        },
      });
    });

    it('should handle exception with string response', () => {
      const exception = new BadRequestException('Simple error message');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Simple error message',
        },
      });
    });
  });

  describe('Unknown Exceptions', () => {
    it('should return INTERNAL_SERVER_ERROR code for unknown errors', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      });
    });

    it('should return INTERNAL_SERVER_ERROR for non-Error objects', () => {
      const exception = 'String error';

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      });
    });

    it('should return INTERNAL_SERVER_ERROR for null/undefined', () => {
      filter.catch(null, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      });
    });
  });

  describe('Error Details Extraction', () => {
    it('should not include details object when no extra fields exist', () => {
      const exception = new BadRequestException('Simple error');

      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error.details).toBeUndefined();
    });

    it('should include retryable field in details for custom exceptions', () => {
      const exception = new OptimisticLockException('Order', 'order-1');

      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error.details.retryable).toBe(true);
    });

    it('should include all custom fields from InsufficientFundsException', () => {
      const exception = new InsufficientFundsException(25.5, 100.0);

      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error.details.available).toBe(25.5);
      expect(jsonCall.error.details.required).toBe(100.0);
      expect(jsonCall.error.details.retryable).toBe(false);
    });
  });

  describe('Response Structure', () => {
    it('should always return success: false', () => {
      const exception = new BadRequestException('Error');

      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.success).toBe(false);
    });

    it('should always include error object with code and message', () => {
      const exception = new NotFoundException('Not found');

      filter.catch(exception, mockHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error).toBeDefined();
      expect(jsonCall.error.code).toBeDefined();
      expect(jsonCall.error.message).toBeDefined();
    });
  });
});
