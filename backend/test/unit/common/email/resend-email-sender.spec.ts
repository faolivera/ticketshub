import { ResendEmailSender } from '../../../../src/common/email/resend-email-sender';
import type { Ctx } from '../../../../src/common/types/context';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

describe('ResendEmailSender', () => {
  const config = {
    apiKey: 're_test_key',
    fromEmail: 'noreply@example.com',
  };
  const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-req' };

  let sender: ResendEmailSender;

  beforeEach(() => {
    mockSend.mockReset();
    sender = new ResendEmailSender(config);
  });

  it('should send email and return success with messageId', async () => {
    mockSend.mockResolvedValue({ data: { id: 'resend-msg-123' }, error: null });

    const result = await sender.send(mockCtx, {
      to: 'user@example.com',
      subject: 'Test',
      body: 'Plain body',
    });

    expect(result).toEqual({ success: true, messageId: 'resend-msg-123' });
    expect(mockSend).toHaveBeenCalledWith({
      from: config.fromEmail,
      to: 'user@example.com',
      subject: 'Test',
      html: 'Plain body',
      text: 'Plain body',
    });
  });

  it('should use htmlBody when provided', async () => {
    mockSend.mockResolvedValue({ data: { id: 'resend-msg-456' }, error: null });

    await sender.send(mockCtx, {
      to: 'user@example.com',
      subject: 'HTML Test',
      body: 'Plain fallback',
      htmlBody: '<p>HTML content</p>',
    });

    expect(mockSend).toHaveBeenCalledWith({
      from: config.fromEmail,
      to: 'user@example.com',
      subject: 'HTML Test',
      html: '<p>HTML content</p>',
      text: 'Plain fallback',
    });
  });

  it('should return failure when Resend returns error', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'Invalid API key', name: 'ValidationError' },
    });

    const result = await sender.send(mockCtx, {
      to: 'user@example.com',
      subject: 'Test',
      body: 'Body',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid API key',
    });
  });

  it('should return failure and log when send throws', async () => {
    mockSend.mockRejectedValue(new Error('Network error'));

    const result = await sender.send(mockCtx, {
      to: 'user@example.com',
      subject: 'Test',
      body: 'Body',
    });

    expect(result).toEqual({
      success: false,
      error: 'Network error',
    });
  });
});
