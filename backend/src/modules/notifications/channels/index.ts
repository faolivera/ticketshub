export type {
  NotificationChannelProvider,
  ChannelSendResult,
} from './channel.interface';
import { InAppChannel } from './in-app.channel';
import { EmailChannel } from './email.channel';

export { InAppChannel, EmailChannel };
export const ALL_CHANNELS = [InAppChannel, EmailChannel];
