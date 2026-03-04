/**
 * Abstraction for broadcasting realtime events to connected clients.
 * Implementations may be in-memory (single instance) or Redis-backed (multi-instance).
 */
export interface IRealtimeBroadcaster {
  /**
   * Emit an event to all sockets for a given user (room: user:${userId}).
   */
  emitToUser(userId: string, event: string, payload: unknown): Promise<void>;

  /**
   * Emit an event to all sockets in a room (e.g. transaction:${transactionId}).
   */
  emitToRoom(roomId: string, event: string, payload: unknown): Promise<void>;
}
