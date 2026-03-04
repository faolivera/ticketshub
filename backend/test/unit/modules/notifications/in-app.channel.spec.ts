import { Test, TestingModule } from '@nestjs/testing';
import { InAppChannel } from '../../../../src/modules/notifications/channels/in-app.channel';
import { REALTIME_BROADCASTER } from '../../../../src/modules/realtime/realtime.module';
import type { IRealtimeBroadcaster } from '../../../../src/common/realtime';
import { NotificationEventType } from '../../../../src/modules/notifications/notifications.domain';
import type { Notification } from '../../../../src/modules/notifications/notifications.domain';
import type { Ctx } from '../../../../src/common/types/context';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-req' };

function createNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif_1',
    eventId: 'evt_1',
    eventType: NotificationEventType.PAYMENT_REQUIRED,
    recipientId: 'user_1',
    channel: 'IN_APP' as any,
    title: 'Payment required',
    body: 'Please complete your payment.',
    actionUrl: '/wallet',
    status: 'DELIVERED' as any,
    read: false,
    retryCount: 0,
    createdAt: new Date('2025-01-01T12:00:00Z'),
    updatedAt: new Date('2025-01-01T12:00:00Z'),
    ...overrides,
  };
}

describe('InAppChannel', () => {
  describe('when broadcaster is not provided', () => {
    let channel: InAppChannel;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InAppChannel,
          { provide: REALTIME_BROADCASTER, useValue: null },
        ],
      }).compile();
      channel = module.get(InAppChannel);
    });

    it('should return success without calling broadcaster', async () => {
      const notification = createNotification();
      const result = await channel.send(mockCtx, notification);
      expect(result).toEqual({ success: true });
    });
  });

  describe('when broadcaster is provided', () => {
    let channel: InAppChannel;
    let broadcaster: jest.Mocked<IRealtimeBroadcaster>;

    beforeEach(async () => {
      broadcaster = {
        emitToUser: jest.fn().mockResolvedValue(undefined),
        emitToRoom: jest.fn().mockResolvedValue(undefined),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InAppChannel,
          { provide: REALTIME_BROADCASTER, useValue: broadcaster },
        ],
      }).compile();
      channel = module.get(InAppChannel);
    });

    it('should call emitToUser with notification payload', async () => {
      const notification = createNotification();
      const result = await channel.send(mockCtx, notification);
      expect(result).toEqual({ success: true });
      expect(broadcaster.emitToUser).toHaveBeenCalledTimes(1);
      expect(broadcaster.emitToUser).toHaveBeenCalledWith(
        'user_1',
        'notification',
        {
          id: 'notif_1',
          eventType: NotificationEventType.PAYMENT_REQUIRED,
          title: 'Payment required',
          body: 'Please complete your payment.',
          actionUrl: '/wallet',
          createdAt: '2025-01-01T12:00:00.000Z',
          read: false,
        },
      );
    });

    it('should return success even when broadcaster.emitToUser rejects', async () => {
      broadcaster.emitToUser.mockRejectedValue(new Error('Network error'));
      const notification = createNotification();
      const result = await channel.send(mockCtx, notification);
      expect(result).toEqual({ success: true });
    });
  });
});
