import { BadRequestException } from '@nestjs/common';

/**
 * Exception thrown when a wallet or account has insufficient funds
 * to complete a requested operation.
 */
export class InsufficientFundsException extends BadRequestException {
  public readonly code = 'INSUFFICIENT_FUNDS';
  public readonly available: number;
  public readonly required: number;

  constructor(available: number, required: number) {
    super({
      message: `Insufficient funds. Available: ${available}, Required: ${required}`,
      error: 'InsufficientFunds',
      code: 'INSUFFICIENT_FUNDS',
      available,
      required,
      retryable: false,
    });
    this.available = available;
    this.required = required;
  }
}
