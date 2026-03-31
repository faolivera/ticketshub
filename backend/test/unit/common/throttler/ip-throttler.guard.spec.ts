import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IpThrottlerGuard } from '@/common/throttler/ip-throttler.guard';

// Minimal mock — we only test the two overridden methods, not the full guard pipeline
const makeGuard = () =>
  new IpThrottlerGuard({} as any, {} as any, {} as any);

const makeReq = (overrides: Partial<{ headers: Record<string, string>; socket: { remoteAddress?: string }; path: string }> = {}) => ({
  headers: {},
  socket: { remoteAddress: undefined },
  path: '/api/some-route',
  ...overrides,
});

describe('IpThrottlerGuard', () => {
  describe('getTracker', () => {
    it('returns first IP from x-forwarded-for when present', async () => {
      const guard = makeGuard();
      const req = makeReq({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
      const ip = await (guard as any).getTracker(req);
      expect(ip).toBe('1.2.3.4');
    });

    it('falls back to socket.remoteAddress when x-forwarded-for is absent', async () => {
      const guard = makeGuard();
      const req = makeReq({ socket: { remoteAddress: '9.9.9.9' } });
      const ip = await (guard as any).getTracker(req);
      expect(ip).toBe('9.9.9.9');
    });

    it('throws UnauthorizedException when both sources are absent', async () => {
      const guard = makeGuard();
      const req = makeReq();
      await expect((guard as any).getTracker(req)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('canActivate', () => {
    it('returns true immediately for /metrics without calling super', async () => {
      const guard = makeGuard();
      const superSpy = jest
        .spyOn(ThrottlerGuard.prototype, 'canActivate')
        .mockResolvedValue(true);

      const ctx = {
        switchToHttp: () => ({ getRequest: () => makeReq({ path: '/metrics' }) }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      expect(superSpy).not.toHaveBeenCalled();
      superSpy.mockRestore();
    });

    it('calls super.canActivate for non-metrics paths', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const guard = makeGuard();
      const superSpy = jest
        .spyOn(ThrottlerGuard.prototype, 'canActivate')
        .mockResolvedValue(true);

      const ctx = {
        switchToHttp: () => ({ getRequest: () => makeReq({ path: '/api/support/contact' }) }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(ctx);
      expect(superSpy).toHaveBeenCalled();
      expect(result).toBe(true);
      superSpy.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
