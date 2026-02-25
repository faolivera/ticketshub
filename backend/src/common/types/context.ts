// Context interface for propagating request context information
// Used for logging, tracing, and passing contextual data through method calls

/**
 * Source of the context - indicates where the request/event originated
 */
export type ContextSource = 'HTTP' | 'event' | 'app-init';

export interface Ctx {
  /**
   * Source of the context (HTTP request, event, etc.)
   */
  source: ContextSource;

  /**
   * Request ID for tracing requests across services/methods
   */
  requestId?: string;

  /**
   * Authenticated user ID (if available)
   */
  userId?: string;

  /**
   * Timestamp when the context was created
   */
  timestamp?: Date;

  /**
   * HTTP method (GET, POST, etc.) - only relevant for HTTP source
   */
  method?: string;

  /**
   * Request path/endpoint - only relevant for HTTP source
   */
  path?: string;

  /**
   * Additional metadata that can be attached to the context
   */
  metadata?: Record<string, unknown>;
}

export const ON_APP_INIT_CTX: Ctx = {
  source: 'app-init',
  requestId: undefined,
  timestamp: new Date(),
  method: undefined,
  path: undefined,
  userId: undefined,
  metadata: {},
};
