import type { Server } from 'socket.io';
import type { IRealtimeBroadcaster } from './realtime-broadcaster.interface';

const USER_ROOM_PREFIX = 'user:';

/**
 * In-memory broadcaster that uses the Socket.IO Server instance.
 * The server reference is set by the gateway in afterInit().
 * Use this for single-instance deployments; for multiple instances, implement
 * IRealtimeBroadcaster with Redis (or similar) and swap the provider.
 */
export class InMemoryRealtimeBroadcaster implements IRealtimeBroadcaster {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  async emitToUser(userId: string, event: string, payload: unknown): Promise<void> {
    if (!this.server) return;
    const roomId = USER_ROOM_PREFIX + userId;
    this.server.to(roomId).emit(event, payload);
  }

  async emitToRoom(roomId: string, event: string, payload: unknown): Promise<void> {
    if (!this.server) return;
    this.server.to(roomId).emit(event, payload);
  }
}
