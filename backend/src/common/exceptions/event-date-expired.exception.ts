import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Thrown when a buyer tries to purchase tickets for an event date that has already passed
 * or is within the purchase cutoff window.
 * Frontend can check error.code === 'EVENT_DATE_EXPIRED' to show a specific message.
 */
export class EventDateExpiredException extends HttpException {
  public readonly code = 'EVENT_DATE_EXPIRED' as const;

  constructor() {
    super(
      {
        message: 'Event date is no longer available for purchase',
        error: 'EventDateExpired',
        code: 'EVENT_DATE_EXPIRED',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
