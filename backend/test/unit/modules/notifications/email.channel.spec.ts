import { Test, TestingModule } from '@nestjs/testing';
import { EmailChannel } from '../../../../src/modules/notifications/channels/email.channel';
import { EMAIL_SENDER } from '../../../../src/common/email/email-sender.interface';
import type { IEmailSender } from '../../../../src/common/email/email-sender.interface';
import { UsersService } from '../../../../src/modules/users/users.service';
import type { Notification } from '../../../../src/modules/notifications/notifications.domain';
import { NotificationEventType } from '../../../../src/modules/notifications/notifications.domain';
import type { Ctx } from '../../../../src/common/types/context';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-req' };

function createNotification(
  overrides: Partial<Notification> = {},
): Notification {
  return {
    id: 'notif_1',
    eventId: 'evt_1',
    eventType: NotificationEventType.PAYMENT_REQUIRED,
    recipientId: 'user_1',
    channel: 'EMAIL' as any,
    title: 'Payment required',
    body: 'Please complete your payment.',
    status: 'PENDING' as any,
    read: false,
    retryCount: 0,
    createdAt: new Date('2025-01-01T12:00:00Z'),
    updatedAt: new Date('2025-01-01T12:00:00Z'),
    ...overrides,
  };
}

describe('EmailChannel', () => {
  let channel: EmailChannel;
  let emailSender: jest.Mocked<IEmailSender>;
  let usersService: jest.Mocked<Pick<UsersService, 'findById'>>;

  beforeEach(async () => {
    emailSender = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg_1' }),
    };

    usersService = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailChannel,
        { provide: EMAIL_SENDER, useValue: emailSender },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    channel = module.get(EmailChannel);
  });

  it('should send email when user has email', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
    } as any);
    const notification = createNotification();

    const result = await channel.send(mockCtx, notification);

    expect(result).toEqual({ success: true, externalId: 'msg_1' });
    expect(usersService.findById).toHaveBeenCalledWith(mockCtx, 'user_1');
    expect(emailSender.send).toHaveBeenCalledWith(mockCtx, {
      to: 'user@example.com',
      subject: 'Payment required',
      body: 'Please complete your payment.',
    });
  });

  it('should return failure when user has no email', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user_1',
      email: undefined,
    } as any);
    const notification = createNotification();

    const result = await channel.send(mockCtx, notification);

    expect(result).toEqual({
      success: false,
      error: 'Recipient has no email',
    });
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it('should return failure when user not found', async () => {
    usersService.findById.mockResolvedValue(undefined);
    const notification = createNotification();

    const result = await channel.send(mockCtx, notification);

    expect(result).toEqual({
      success: false,
      error: 'Recipient has no email',
    });
  });

  it('should return failure when emailSender returns success: false', async () => {
    usersService.findById.mockResolvedValue({
      id: 'user_1',
      email: 'user@example.com',
    } as any);
    emailSender.send.mockResolvedValue({
      success: false,
      error: 'SES rate limit',
    });
    const notification = createNotification();

    const result = await channel.send(mockCtx, notification);

    expect(result).toEqual({ success: false, error: 'SES rate limit' });
  });
});
