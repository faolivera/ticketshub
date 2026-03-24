import type { Ctx } from '../../../common/types/context';
import type {
  NotificationEventType,
  NotificationRecipient,
  NotificationRecipientRole,
} from '../notifications.domain';

/**
 * Interface that all event processors must implement.
 * Processors determine who receives notifications and what template variables to use.
 */
export interface EventProcessor<TContext = Record<string, unknown>> {
  /**
   * The event type this processor handles
   */
  readonly eventType: NotificationEventType;

  /**
   * Determine who should receive notifications for this event.
   * The actual channels are determined by NotificationChannelConfig.
   */
  getRecipients(ctx: Ctx, context: TContext): Promise<NotificationRecipient[]>;

  /**
   * Extract template variables from the event context.
   * These variables are used to render notification templates.
   */
  getTemplateVariables(
    context: TContext,
    recipientId: string,
    role: NotificationRecipientRole,
  ): Record<string, string>;
}
