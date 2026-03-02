import { BadRequestException } from '@nestjs/common';

/**
 * Exception thrown when there are not enough tickets available
 * for a purchase request.
 */
export class TicketNotAvailableException extends BadRequestException {
  public readonly code = 'TICKET_NOT_AVAILABLE';
  public readonly listingId: string;
  public readonly requestedQuantity: number;
  public readonly availableQuantity: number;

  constructor(
    listingId: string,
    requestedQuantity: number,
    availableQuantity: number,
  ) {
    super({
      message: `Not enough tickets available. Requested: ${requestedQuantity}, Available: ${availableQuantity}`,
      error: 'TicketNotAvailable',
      code: 'TICKET_NOT_AVAILABLE',
      listingId,
      requestedQuantity,
      availableQuantity,
      retryable: true,
    });
    this.listingId = listingId;
    this.requestedQuantity = requestedQuantity;
    this.availableQuantity = availableQuantity;
  }
}
