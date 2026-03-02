import { ConflictException } from '@nestjs/common';

/**
 * Exception thrown when an optimistic lock conflict is detected.
 * This occurs when a resource was modified by another process between
 * read and write operations.
 */
export class OptimisticLockException extends ConflictException {
  public readonly code = 'OPTIMISTIC_LOCK_CONFLICT';
  public readonly resource: string;
  public readonly resourceId: string;

  constructor(resource: string, resourceId: string) {
    super({
      message: `The ${resource} was modified by another process. Please refresh and try again.`,
      error: 'OptimisticLockConflict',
      code: 'OPTIMISTIC_LOCK_CONFLICT',
      resource,
      resourceId,
      retryable: true,
    });
    this.resource = resource;
    this.resourceId = resourceId;
  }
}
