import { Injectable, Inject } from '@nestjs/common';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';
import {
  INotificationsRepository,
  NOTIFICATIONS_REPOSITORY,
} from '../notifications.repository.interface';
import { TemplateRenderer } from './template.renderer';
import type {
  NotificationTemplate,
  ChannelContent,
} from '../notifications.domain';
import {
  NotificationEventType,
  NotificationChannel,
  NotificationRecipientRole,
} from '../notifications.domain';

@Injectable()
export class TemplateService {
  private readonly logger = new ContextLogger(TemplateService.name);
  private readonly defaultLocale = 'es';

  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly repository: INotificationsRepository,
    private readonly renderer: TemplateRenderer,
  ) {}

  /**
   * Get and render notification content for a specific event type and channel.
   * Falls back to default locale (Spanish) if requested locale not available.
   */
  async renderContent(
    ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
    recipientRole: NotificationRecipientRole,
    variables: Record<string, string>,
  ): Promise<ChannelContent | null> {
    // Try to find template for the requested locale
    let template = await this.repository.findTemplate(
      ctx,
      eventType,
      channel,
      locale,
      recipientRole,
    );

    // Fall back to default locale if not found
    if (!template && locale !== this.defaultLocale) {
      this.logger.debug(
        ctx,
        `Template not found for locale ${locale}, falling back to ${this.defaultLocale}`,
      );
      template = await this.repository.findTemplate(
        ctx,
        eventType,
        channel,
        this.defaultLocale,
        recipientRole,
      );
    }

    if (!template) {
      this.logger.warn(
        ctx,
        `No template found for ${eventType}/${channel}/${locale}/${recipientRole}`,
      );
      return null;
    }

    if (!template.isActive) {
      this.logger.warn(ctx, `Template ${template.id} is not active`);
      return null;
    }

    // Render actionUrl first so it can be used as a variable inside the body
    const actionUrl = template.actionUrlTemplate
      ? this.renderer.render(ctx, template.actionUrlTemplate, variables)
      : undefined;

    const allVariables = actionUrl ? { ...variables, actionUrl } : variables;

    const title = this.renderer.render(ctx, template.titleTemplate, allVariables);
    const body = this.renderer.render(ctx, template.bodyTemplate, allVariables);

    return {
      title,
      body,
      actionUrl,
    };
  }

  /**
   * Get a template without rendering (for admin preview)
   */
  async getTemplate(
    ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
    recipientRole: NotificationRecipientRole,
  ): Promise<NotificationTemplate | undefined> {
    return await this.repository.findTemplate(ctx, eventType, channel, locale, recipientRole);
  }

  /**
   * Preview a template with sample variables
   */
  previewTemplate(
    ctx: Ctx,
    template: NotificationTemplate,
    variables: Record<string, string>,
  ): ChannelContent {
    const actionUrl = template.actionUrlTemplate
      ? this.renderer.render(ctx, template.actionUrlTemplate, variables)
      : undefined;

    const allVariables = actionUrl ? { ...variables, actionUrl } : variables;

    const title = this.renderer.render(ctx, template.titleTemplate, allVariables);
    const body = this.renderer.render(ctx, template.bodyTemplate, allVariables);

    return {
      title,
      body,
      actionUrl,
    };
  }
}
