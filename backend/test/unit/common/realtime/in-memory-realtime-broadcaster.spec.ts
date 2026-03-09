import { InMemoryRealtimeBroadcaster } from '../../../../src/common/realtime';
import type { Server } from 'socket.io';

describe('InMemoryRealtimeBroadcaster', () => {
  let broadcaster: InMemoryRealtimeBroadcaster;
  let mockServer: Partial<Server>;

  beforeEach(() => {
    broadcaster = new InMemoryRealtimeBroadcaster();
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
  });

  describe('setServer', () => {
    it('should store the server reference', () => {
      broadcaster.setServer(mockServer as Server);
      expect(broadcaster).toBeDefined();
    });
  });

  describe('emitToUser', () => {
    it('should emit to room user:${userId} when server is set', async () => {
      broadcaster.setServer(mockServer as Server);
      await broadcaster.emitToUser('user_1', 'notification', { id: 'n1' });
      expect(mockServer.to).toHaveBeenCalledWith('user:user_1');
      expect(mockServer.emit).toHaveBeenCalledWith('notification', {
        id: 'n1',
      });
    });

    it('should do nothing when server is not set', async () => {
      await broadcaster.emitToUser('user_1', 'notification', {});
      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('emitToRoom', () => {
    it('should emit to the given room when server is set', async () => {
      broadcaster.setServer(mockServer as Server);
      await broadcaster.emitToRoom('transaction:txn_1', 'chat:message', {
        id: 'msg_1',
        content: 'Hi',
      });
      expect(mockServer.to).toHaveBeenCalledWith('transaction:txn_1');
      expect(mockServer.emit).toHaveBeenCalledWith('chat:message', {
        id: 'msg_1',
        content: 'Hi',
      });
    });

    it('should do nothing when server is not set', async () => {
      await broadcaster.emitToRoom('transaction:txn_1', 'chat:message', {});
      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });
});
