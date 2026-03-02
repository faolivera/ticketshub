import { ConflictException } from '@nestjs/common';

/**
 * Generic conflict exception for resource state conflicts.
 * Use this when a resource cannot be modified due to its current state
 * or concurrent modifications.
 */
export class ResourceConflictException extends ConflictException {
  public readonly code = 'RESOURCE_CONFLICT';
  public readonly resource: string;
  public readonly resourceId?: string;

  constructor(resource: string, message: string, resourceId?: string) {
    super({
      message,
      error: 'ResourceConflict',
      code: 'RESOURCE_CONFLICT',
      resource,
      resourceId,
      retryable: true,
    });
    this.resource = resource;
    this.resourceId = resourceId;
  }
}
