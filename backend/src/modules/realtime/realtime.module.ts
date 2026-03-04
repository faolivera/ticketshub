import { Module } from '@nestjs/common';
import { InMemoryRealtimeBroadcaster } from '../../common/realtime';

export const REALTIME_BROADCASTER = Symbol('REALTIME_BROADCASTER');

@Module({
  providers: [
    InMemoryRealtimeBroadcaster,
    {
      provide: REALTIME_BROADCASTER,
      useExisting: InMemoryRealtimeBroadcaster,
    },
  ],
  exports: [REALTIME_BROADCASTER, InMemoryRealtimeBroadcaster],
})
export class RealtimeModule {}
