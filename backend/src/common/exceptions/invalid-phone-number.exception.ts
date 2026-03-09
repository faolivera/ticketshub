import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a phone number fails validation (e.g. not a valid Argentina number).
 * Frontend can check error.code === 'INVALID_PHONE_NUMBER' to show a specific message.
 */
export class InvalidPhoneNumberException extends HttpException {
  public readonly code = 'INVALID_PHONE_NUMBER' as const;

  constructor(message: string = 'Invalid phone number for Argentina.') {
    super(
      {
        message,
        error: 'InvalidPhoneNumber',
        code: 'INVALID_PHONE_NUMBER',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
