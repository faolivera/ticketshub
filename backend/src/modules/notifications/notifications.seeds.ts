import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import { ON_APP_INIT_CTX } from '../../common/types/context';
import {
  INotificationsRepository,
  NOTIFICATIONS_REPOSITORY,
} from './notifications.repository.interface';
import type {
  NotificationTemplate,
  NotificationChannelConfig,
} from './notifications.domain';
import {
  NotificationEventType,
  NotificationChannel,
  NotificationPriority,
  NotificationRecipientRole,
  generateNotificationTemplateId,
  generateNotificationChannelConfigId,
} from './notifications.domain';

/**
 * Seeds default notification templates and channel configs on startup
 * if they don't already exist.
 */
@Injectable()
export class NotificationsSeeder implements OnModuleInit {
  private readonly logger = new ContextLogger(NotificationsSeeder.name);

  constructor(
    @Inject(NOTIFICATIONS_REPOSITORY)
    private readonly repository: INotificationsRepository,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedChannelConfigs(ON_APP_INIT_CTX);
    await this.seedTemplates(ON_APP_INIT_CTX);

    const isProduction = this.configService.get<string>('app.environment') === 'prod';
    if (isProduction) {
      this.logger.log(ON_APP_INIT_CTX, 'Production environment — skipping template sync to preserve admin edits');
      return;
    }

    // In non-production: sync so code changes to getDefaultTemplates() are reflected immediately
    const sync = await this.syncTemplates(ON_APP_INIT_CTX);
    if (sync.created > 0 || sync.updated > 0) {
      this.logger.log(
        ON_APP_INIT_CTX,
        `Notification templates sync: ${sync.created} created, ${sync.updated} updated`,
      );
    }
  }

  /**
   * Sync existing templates with default content (title, body, actionUrl).
   * Call from a script to apply template changes without deleting data.
   */
  async syncTemplates(ctx: Ctx): Promise<{ updated: number; created: number }> {
    const defaults = this.getDefaultTemplates();
    let updated = 0;
    let created = 0;
    for (const template of defaults) {
      const existing = await this.repository.findTemplate(
        ctx,
        template.eventType,
        template.channel,
        template.locale,
        template.recipientRole,
      );
      if (existing) {
        await this.repository.updateTemplate(ctx, existing.id, {
          titleTemplate: template.titleTemplate,
          bodyTemplate: template.bodyTemplate,
          actionUrlTemplate: template.actionUrlTemplate,
        });
        updated++;
      } else {
        await this.repository.createTemplate(ctx, {
          ...template,
          id: generateNotificationTemplateId(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        created++;
      }
    }
    return { updated, created };
  }

  private async seedChannelConfigs(ctx: Ctx): Promise<void> {
    const existing = await this.repository.findAllChannelConfigs(ctx);
    const existingEventTypes = new Set(existing.map((c) => c.eventType));

    if (existingEventTypes.size >= Object.keys(NotificationEventType).length) {
      this.logger.log(
        ctx,
        `All channel configs already exist (${existing.length}), skipping seed`,
      );
      return;
    }

    this.logger.log(ctx, 'Seeding missing channel configs...');

    const configs: Omit<NotificationChannelConfig, 'id'>[] = [
      {
        eventType: NotificationEventType.BUYER_PAYMENT_SUBMITTED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.PAYMENT_RECEIVED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.BUYER_PAYMENT_REJECTED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.TICKET_SENT,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.TICKET_RECEIVED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.NORMAL,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.TRANSACTION_COMPLETED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.NORMAL,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.TRANSACTION_CANCELLED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.DISPUTE_OPENED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.URGENT,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.DISPUTE_RESOLVED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.IDENTITY_VERIFIED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.NORMAL,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.IDENTITY_REJECTED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.IDENTITY_SUBMITTED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.BANK_ACCOUNT_SUBMITTED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.SELLER_VERIFICATION_COMPLETE,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.NORMAL,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.EVENT_APPROVED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.NORMAL,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.EVENT_REJECTED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.REVIEW_RECEIVED,
        inAppEnabled: true,
        emailEnabled: false,
        priority: NotificationPriority.LOW,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.OFFER_RECEIVED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.OFFER_ACCEPTED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.OFFER_REJECTED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.NORMAL,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.OFFER_CANCELLED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.NORMAL,
        updatedAt: new Date(),
      },
      {
        eventType: NotificationEventType.OFFER_EXPIRED,
        inAppEnabled: true,
        emailEnabled: true,
        priority: NotificationPriority.NORMAL,
        updatedAt: new Date(),
      },
    ];

    let seededCount = 0;
    for (const config of configs) {
      if (!existingEventTypes.has(config.eventType)) {
        await this.repository.createChannelConfig(ctx, {
          ...config,
          id: generateNotificationChannelConfigId(),
        });
        seededCount++;
      }
    }

    this.logger.log(
      ctx,
      `Seeded ${seededCount} channel configs (${existing.length} already existed)`,
    );
  }

  private async seedTemplates(ctx: Ctx): Promise<void> {
    const existing = await this.repository.findAllTemplates(ctx);
    if (existing.length > 0) {
      this.logger.log(
        ctx,
        `Templates already exist (${existing.length}), skipping seed`,
      );
      return;
    }

    this.logger.log(ctx, 'Seeding default templates...');

    const templates = this.getDefaultTemplates();

    for (const template of templates) {
      await this.repository.createTemplate(ctx, {
        ...template,
        id: generateNotificationTemplateId(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    this.logger.log(ctx, `Seeded ${templates.length} templates`);
  }

  private getDefaultTemplates(): Omit<
    NotificationTemplate,
    'id' | 'isActive' | 'createdAt' | 'updatedAt'
  >[] {
    return [
      // BUYER_PAYMENT_SUBMITTED (notify admins; link to admin transactions)
      {
        eventType: NotificationEventType.BUYER_PAYMENT_SUBMITTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.ADMIN,
        titleTemplate: 'Nuevo pago recibido',
        bodyTemplate:
          '{{buyerName}} envió un comprobante de pago para "{{eventName}}"',
        actionUrlTemplate: '/admin/transactions',
      },
      {
        eventType: NotificationEventType.BUYER_PAYMENT_SUBMITTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.ADMIN,
        titleTemplate: 'Pago recibido para "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <span class="th-tag th-tag--info">Admin</span>
    <h1 class="th-title">Nuevo pago recibido</h1>
    <p class="th-text">Un comprador realizó un pago pendiente de procesamiento.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Comprador</span><span class="th-value">{{buyerName}}</span></div>
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Monto</span><span class="th-value th-value--highlight">{{amountFormatted}} {{currency}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver en el panel</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub &middot; Admin</p>
    <p>ticketshub.com.ar</p>
  </div>
</div>`,
        actionUrlTemplate: '/admin/transactions',
      },

      // PAYMENT_RECEIVED — BUYER
      {
        eventType: NotificationEventType.PAYMENT_RECEIVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Pago confirmado',
        bodyTemplate:
          'Tu pago por "{{eventName}}" fue confirmado. Recibirás tus entradas pronto.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.PAYMENT_RECEIVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Tu pago para "{{eventName}}" fue confirmado',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--success">&#10003;</div>
    <h1 class="th-title">Tu pago fue confirmado</h1>
    <p class="th-text">Recibimos tu pago por las entradas de <strong>{{eventName}}</strong>. El vendedor te las enviará pronto.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Monto</span><span class="th-value th-value--highlight">{{amountFormatted}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--info"><p>Tu pago está protegido y queda retenido hasta que validemos la entrega de las entradas.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver mi compra</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // PAYMENT_RECEIVED — SELLER
      {
        eventType: NotificationEventType.PAYMENT_RECEIVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Nuevo pago confirmado',
        bodyTemplate:
          'Recibimos el pago de {{ticketCount}} entrada(s) para "{{eventName}}". ¡Transferí las entradas lo antes posible!',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.PAYMENT_RECEIVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Pago recibido para "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--success">&#10003;</div>
    <h1 class="th-title">Pago recibido por {{eventName}}</h1>
    <p class="th-text">Confirmamos el pago de {{ticketCount}} entrada(s) para <strong>{{eventName}}</strong>. Enviá las entradas lo antes posible para liberar los fondos.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Monto a recibir</span><span class="th-value th-value--highlight">{{amountFormatted}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--info"><p>El dinero queda retenido de forma segura hasta que validemos la entrega. Una vez confirmada, acreditamos el monto en tu cuenta.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver mi venta</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // BUYER_PAYMENT_REJECTED
      {
        eventType: NotificationEventType.BUYER_PAYMENT_REJECTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Pago rechazado',
        bodyTemplate: '{{sellerName}} rechazó tu pago para "{{eventName}}"',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.BUYER_PAYMENT_REJECTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Tu pago para "{{eventName}}" fue rechazado',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--danger">&#10005;</div>
    <h1 class="th-title">Hubo un problema con tu pago</h1>
    <p class="th-text">El pago para la siguiente transacción no pudo procesarse. No se realizó ningún cargo a tu cuenta.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Vendedor</span><span class="th-value">{{sellerName}}</span></div>
      <div class="th-row"><span class="th-label">Motivo</span><span class="th-value">{{rejectionReason}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--warning"><p>Podés reintentar el pago con el mismo método o elegir uno diferente. Las entradas seguirán disponibles hasta que se completen.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Reintentar pago</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // TICKET_SENT (buyer notified when seller transfers the ticket)
      {
        eventType: NotificationEventType.TICKET_SENT,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: '¡Entrada enviada!',
        bodyTemplate:
          'El vendedor te envió tu entrada para "{{eventName}}". Revisá que todo esté en orden y confirmá la recepción.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.TICKET_SENT,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: '¡Tu entrada para "{{eventName}}" está en camino!',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--success">&#127903;</div>
    <h1 class="th-title">Tus entradas están en camino</h1>
    <p class="th-text">El vendedor envió las entradas. Ingresá a tu transacción para revisarlas y confirmar la recepción.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Fecha</span><span class="th-value">{{eventDate}}</span></div>
      <div class="th-row"><span class="th-label">Lugar</span><span class="th-value">{{venue}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--info"><p>Revisá que todo esté en orden antes de confirmar la recepción. El pago se libera al vendedor únicamente después de tu confirmación. Si encontrás algún problema, reportalo antes de confirmar.</p></div>
    <div class="th-btn-group">
      <a href="{{actionUrl}}" class="th-btn">Ver mis entradas</a>
      <a href="{{actionUrl}}" class="th-btn th-btn--secondary">Reportar un problema</a>
    </div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // TICKET_RECEIVED (seller notified when buyer confirms receipt)
      {
        eventType: NotificationEventType.TICKET_RECEIVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Recepción confirmada',
        bodyTemplate:
          'El comprador confirmó haber recibido las entradas de "{{eventName}}". Los fondos serán liberados pronto.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.TICKET_RECEIVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'El comprador confirmó recibir las entradas de "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--success">&#10003;</div>
    <h1 class="th-title">La entrega fue registrada</h1>
    <p class="th-text">El comprador recibió las entradas de <strong>{{eventName}}</strong>. Estamos procesando la liberación del pago a tu cuenta.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--success"><p>El pago se acreditará en tu cuenta en breve. Vas a recibir una notificación cuando se confirme la acreditación.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver mi venta</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // TRANSACTION_COMPLETED
      {
        eventType: NotificationEventType.TRANSACTION_COMPLETED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Venta completada',
        bodyTemplate:
          'Tu venta de "{{eventName}}" se ha completado. Fondos liberados: {{amountFormatted}}',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.TRANSACTION_COMPLETED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Venta completada - Fondos liberados',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--success">&#128248;</div>
    <h1 class="th-title">Tu pago fue acreditado</h1>
    <p class="th-text">La transacción se completó correctamente. El monto ya está disponible en tu cuenta.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Monto acreditado</span><span class="th-value th-value--highlight">{{amountFormatted}} {{currency}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver detalle</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // TRANSACTION_CANCELLED — BUYER
      {
        eventType: NotificationEventType.TRANSACTION_CANCELLED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Transacción cancelada',
        bodyTemplate: 'La transacción de "{{eventName}}" fue cancelada',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.TRANSACTION_CANCELLED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Transacción cancelada - "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--warning">&#33;</div>
    <h1 class="th-title">Tu transacción fue cancelada</h1>
    <p class="th-text">La compra de entradas para <strong>{{eventName}}</strong> fue cancelada.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Cancelado por</span><span class="th-value">{{cancelledBy}}</span></div>
      <div class="th-row"><span class="th-label">Motivo</span><span class="th-value">{{reason}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--info"><p>Si ya habías realizado el pago, el reintegro se procesa automáticamente. Podés buscar otras opciones disponibles para el mismo evento.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Buscar otras entradas</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // TRANSACTION_CANCELLED — SELLER
      {
        eventType: NotificationEventType.TRANSACTION_CANCELLED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Transacción cancelada',
        bodyTemplate: 'La transacción de "{{eventName}}" fue cancelada',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.TRANSACTION_CANCELLED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Transacción cancelada - "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--warning">&#33;</div>
    <h1 class="th-title">Una de tus ventas fue cancelada</h1>
    <p class="th-text">La venta de entradas para <strong>{{eventName}}</strong> fue cancelada.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Cancelado por</span><span class="th-value">{{cancelledBy}}</span></div>
      <div class="th-row"><span class="th-label">Motivo</span><span class="th-value">{{reason}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--info"><p>Tus entradas volvieron a estar disponibles en la plataforma. Podés modificarlas o republicarlas desde tu panel de vendedor.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver mis publicaciones</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // DISPUTE_OPENED — SELLER
      {
        eventType: NotificationEventType.DISPUTE_OPENED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Nueva disputa abierta',
        bodyTemplate: 'Se ha abierto una disputa para "{{eventName}}"',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.DISPUTE_OPENED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Disputa abierta - "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--warning">&#9888;</div>
    <h1 class="th-title">Se abrió una disputa en tu transacción</h1>
    <p class="th-text">La otra parte reportó un inconveniente. Mientras nuestro equipo revisa el caso, el pago permanece retenido y protegido.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Iniciado por</span><span class="th-value">{{openedBy}}</span></div>
      <div class="th-row"><span class="th-label">Motivo</span><span class="th-value">{{reason}}</span></div>
      <div class="th-row"><span class="th-label">ID de disputa</span><span class="th-value">{{disputeId}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--warning"><p>Nuestro equipo se va a comunicar con vos dentro de las próximas 24 horas. Desde el panel podés enviar tu versión del caso o adjuntar evidencia.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver la disputa</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // DISPUTE_OPENED — BUYER
      {
        eventType: NotificationEventType.DISPUTE_OPENED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Nueva disputa abierta',
        bodyTemplate: 'Se ha abierto una disputa para "{{eventName}}"',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.DISPUTE_OPENED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Disputa abierta - "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--warning">&#9888;</div>
    <h1 class="th-title">Se abrió una disputa en tu transacción</h1>
    <p class="th-text">La otra parte reportó un inconveniente. Mientras nuestro equipo revisa el caso, el pago permanece retenido y protegido.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Iniciado por</span><span class="th-value">{{openedBy}}</span></div>
      <div class="th-row"><span class="th-label">Motivo</span><span class="th-value">{{reason}}</span></div>
      <div class="th-row"><span class="th-label">ID de disputa</span><span class="th-value">{{disputeId}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--warning"><p>Nuestro equipo se va a comunicar con vos dentro de las próximas 24 horas. Desde el panel podés enviar tu versión del caso o adjuntar evidencia.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver la disputa</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // DISPUTE_RESOLVED — BUYER
      {
        eventType: NotificationEventType.DISPUTE_RESOLVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Disputa resuelta',
        bodyTemplate: 'La disputa de "{{eventName}}" ha sido resuelta',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.DISPUTE_RESOLVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Disputa resuelta - "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--info">&#9878;</div>
    <h1 class="th-title">La disputa fue resuelta</h1>
    <p class="th-text">Nuestro equipo analizó el caso y tomó una decisión. A continuación encontrás los detalles de la resolución.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Resolución</span><span class="th-value">{{resolution}}</span></div>
      <div class="th-row"><span class="th-label">A favor de</span><span class="th-value">{{resolvedInFavorOf}}</span></div>
      <div class="th-row"><span class="th-label">ID de disputa</span><span class="th-value">{{disputeId}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--info"><p>Si tenés preguntas sobre esta resolución, podés contactarnos en <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a> dentro de los próximos 7 días hábiles.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver detalle</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // DISPUTE_RESOLVED — SELLER
      {
        eventType: NotificationEventType.DISPUTE_RESOLVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Disputa resuelta',
        bodyTemplate: 'La disputa de "{{eventName}}" ha sido resuelta',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.DISPUTE_RESOLVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Disputa resuelta - "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--info">&#9878;</div>
    <h1 class="th-title">La disputa fue resuelta</h1>
    <p class="th-text">Nuestro equipo analizó el caso y tomó una decisión. A continuación encontrás los detalles de la resolución.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Resolución</span><span class="th-value">{{resolution}}</span></div>
      <div class="th-row"><span class="th-label">A favor de</span><span class="th-value">{{resolvedInFavorOf}}</span></div>
      <div class="th-row"><span class="th-label">ID de disputa</span><span class="th-value">{{disputeId}}</span></div>
      <div class="th-row"><span class="th-label">ID de transacción</span><span class="th-value">{{transactionId}}</span></div>
    </div>
    <div class="th-alert th-alert--info"><p>Si tenés preguntas sobre esta resolución, podés contactarnos en <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a> dentro de los próximos 7 días hábiles.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver detalle</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // IDENTITY_VERIFIED (CTA: seller onboarding; replaces legacy /seller-verification)
      {
        eventType: NotificationEventType.IDENTITY_VERIFIED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Identidad verificada',
        bodyTemplate: '¡Tu identidad ha sido verificada exitosamente!',
        actionUrlTemplate: '/become-seller',
      },
      {
        eventType: NotificationEventType.IDENTITY_VERIFIED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: '¡Tu identidad ha sido verificada!',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--success">&#10003;</div>
    <h1 class="th-title">Tu identidad fue verificada</h1>
    <p class="th-text">Hola, {{userName}}. Revisamos tu documentación y todo está en orden.</p>
    <p class="th-text">Tu cuenta avanzó en el proceso de verificación. Si hay pasos adicionales pendientes, recibirás una notificación cuando el proceso esté completo.</p>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver mi perfil</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/become-seller',
      },

      // IDENTITY_REJECTED
      {
        eventType: NotificationEventType.IDENTITY_REJECTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Verificación rechazada',
        bodyTemplate: 'Tu solicitud de verificación de identidad fue rechazada',
        actionUrlTemplate: '/become-seller',
      },
      {
        eventType: NotificationEventType.IDENTITY_REJECTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Verificación de identidad rechazada',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--danger">&#10005;</div>
    <h1 class="th-title">No pudimos verificar tu identidad</h1>
    <p class="th-text">Hola, {{userName}}. Revisamos la documentación que enviaste, pero encontramos un inconveniente para completar la verificación.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Motivo</span><span class="th-value">{{rejectionReason}}</span></div>
    </div>
    <div class="th-alert th-alert--warning"><p>Podés volver a enviar tu documentación desde tu perfil. Si tenés dudas sobre qué información se requiere, no dudes en contactarnos.</p></div>
    <div class="th-btn-group">
      <a href="{{actionUrl}}" class="th-btn">Reintentar verificación</a>
      <a href="{{actionUrl}}" class="th-btn th-btn--secondary">Contactar soporte</a>
    </div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/become-seller',
      },

      // IDENTITY_SUBMITTED (admin)
      {
        eventType: NotificationEventType.IDENTITY_SUBMITTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.ADMIN,
        titleTemplate: 'Documentos de identidad enviados',
        bodyTemplate:
          '{{userName}} ha enviado documentos para verificación de identidad.',
        actionUrlTemplate: '/admin/identity-verifications?verify=identity',
      },
      {
        eventType: NotificationEventType.IDENTITY_SUBMITTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.ADMIN,
        titleTemplate: 'Nueva solicitud de verificación de identidad',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <span class="th-tag th-tag--info">Admin</span>
    <h1 class="th-title">Nueva verificación de identidad</h1>
    <p class="th-text">Un usuario envió documentación para verificación de identidad y está pendiente de revisión.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Usuario</span><span class="th-value">{{userName}}</span></div>
    </div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Revisar en el panel</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub &middot; Admin</p>
    <p>ticketshub.com.ar</p>
  </div>
</div>`,
        actionUrlTemplate: '/admin/identity-verifications?verify=identity',
      },

      // BANK_ACCOUNT_SUBMITTED (admin)
      {
        eventType: NotificationEventType.BANK_ACCOUNT_SUBMITTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.ADMIN,
        titleTemplate: 'Datos bancarios enviados',
        bodyTemplate:
          '{{userName}} ha enviado datos bancarios para validación.',
        actionUrlTemplate: '/admin/identity-verifications?verify=bank',
      },
      {
        eventType: NotificationEventType.BANK_ACCOUNT_SUBMITTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.ADMIN,
        titleTemplate: 'Nuevos datos bancarios para validar',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <span class="th-tag th-tag--info">Admin</span>
    <h1 class="th-title">Nueva cuenta bancaria para revisar</h1>
    <p class="th-text">Un usuario agregó una cuenta bancaria que está pendiente de verificación.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Usuario</span><span class="th-value">{{userName}}</span></div>
    </div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Revisar en el panel</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub &middot; Admin</p>
    <p>ticketshub.com.ar</p>
  </div>
</div>`,
        actionUrlTemplate: '/admin/identity-verifications?verify=bank',
      },

      // SELLER_VERIFICATION_COMPLETE (seller)
      {
        eventType: NotificationEventType.SELLER_VERIFICATION_COMPLETE,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Verificación completa',
        bodyTemplate:
          '¡Felicidades {{userName}}! Tu identidad y datos bancarios han sido verificados. Ya puedes vender entradas.',
        actionUrlTemplate: '/sell-ticket',
      },
      {
        eventType: NotificationEventType.SELLER_VERIFICATION_COMPLETE,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: '¡Verificación de vendedor completa!',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--success">&#9733;</div>
    <h1 class="th-title">Ya sos vendedor verificado</h1>
    <p class="th-text">Felicitaciones, {{userName}}. Completaste el proceso de verificación y tu perfil de vendedor verificado está activo.</p>
    <p class="th-text">A partir de ahora podés publicar y vender entradas sin límites de volumen ni monto. Los compradores verán el sello de verificación en tu perfil.</p>
    <div class="th-alert th-alert--success"><p>Los perfiles verificados generan mayor confianza en los compradores y tienen mejor visibilidad dentro de la plataforma.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Publicar mis entradas</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/sell-ticket',
      },

      // EVENT_APPROVED
      {
        eventType: NotificationEventType.EVENT_APPROVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Evento aprobado',
        bodyTemplate: 'Tu evento "{{eventName}}" ha sido aprobado',
        actionUrlTemplate: '/event/{{eventSlug}}',
      },
      {
        eventType: NotificationEventType.EVENT_APPROVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Tu evento "{{eventName}}" ha sido aprobado',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--success">&#10003;</div>
    <h1 class="th-title">Tu evento fue aprobado</h1>
    <p class="th-text">Revisamos la información y tu evento ya está publicado en TicketsHub.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">URL</span><span class="th-value">ticketshub.com.ar/e/{{eventSlug}}</span></div>
    </div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver mi evento</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/event/{{eventSlug}}',
      },

      // EVENT_REJECTED
      {
        eventType: NotificationEventType.EVENT_REJECTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Evento rechazado',
        bodyTemplate: 'Tu evento "{{eventName}}" fue rechazado',
        actionUrlTemplate: '/event/{{eventSlug}}',
      },
      {
        eventType: NotificationEventType.EVENT_REJECTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Tu evento "{{eventName}}" fue rechazado',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--danger">&#10005;</div>
    <h1 class="th-title">Tu evento necesita cambios</h1>
    <p class="th-text">Revisamos la información de <strong>{{eventName}}</strong> y encontramos puntos que requieren corrección antes de poder publicarlo.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Motivo</span><span class="th-value">{{rejectionReason}}</span></div>
    </div>
    <div class="th-alert th-alert--warning"><p>Podés editar el evento y reenviarlo para revisión desde tu panel. Si tenés preguntas, escribinos y te ayudamos.</p></div>
    <div class="th-btn-group">
      <a href="{{actionUrl}}" class="th-btn">Editar evento</a>
      <a href="{{actionUrl}}" class="th-btn th-btn--secondary">Contactar soporte</a>
    </div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/event/{{eventSlug}}',
      },

      // REVIEW_RECEIVED
      {
        eventType: NotificationEventType.REVIEW_RECEIVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Nueva reseña recibida',
        bodyTemplate:
          '{{reviewerName}} te dejó una reseña de {{rating}} estrellas',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.REVIEW_RECEIVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Recibiste una nueva reseña',
        bodyTemplate:
          '{{reviewerName}} te dejó una reseña de {{rating}} estrellas.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // OFFER_RECEIVED (seller notified when someone makes an offer on their listing)
      {
        eventType: NotificationEventType.OFFER_RECEIVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Nueva oferta recibida',
        bodyTemplate:
          'Recibiste una oferta de {{amountFormatted}} para "{{eventName}}". Revisa y acepta o rechaza.',
        actionUrlTemplate: '/seller-dashboard?tab=received&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_RECEIVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Nueva oferta en "{{eventName}}"',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--info">&#128172;</div>
    <h1 class="th-title">Recibiste una oferta</h1>
    <p class="th-text">Un comprador hizo una oferta por tus entradas para <strong>{{eventName}}</strong>. Revisala y decidí si la aceptás o no.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Oferta</span><span class="th-value th-value--highlight">{{amountFormatted}} {{currency}}</span></div>
      <div class="th-row"><span class="th-label">ID de oferta</span><span class="th-value">{{offerId}}</span></div>
    </div>
    <div class="th-alert th-alert--warning"><p>Las ofertas tienen un plazo de vigencia limitado. Revisala antes de que venza para no perder la oportunidad.</p></div>
    <div class="th-btn-group">
      <a href="{{actionUrl}}" class="th-btn">Aceptar oferta</a>
      <a href="{{actionUrl}}" class="th-btn th-btn--secondary">Ver detalle</a>
    </div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/seller-dashboard?tab=received&offerId={{offerId}}',
      },

      // OFFER_ACCEPTED (buyer notified when seller accepts their offer; link to My offers so they can open and complete purchase)
      {
        eventType: NotificationEventType.OFFER_ACCEPTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Oferta aceptada',
        bodyTemplate:
          'Tu oferta de {{amountFormatted}} para "{{eventName}}" fue aceptada. Completa la compra antes de que expire.',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_ACCEPTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Tu oferta para "{{eventName}}" fue aceptada',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--success">&#10003;</div>
    <h1 class="th-title">Tu oferta fue aceptada</h1>
    <p class="th-text">El vendedor aceptó tu oferta por las entradas de <strong>{{eventName}}</strong>. Para confirmar la compra, completá el pago antes de que venza el plazo.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Monto acordado</span><span class="th-value th-value--highlight">{{amountFormatted}} {{currency}}</span></div>
      <div class="th-row"><span class="th-label">ID de oferta</span><span class="th-value">{{offerId}}</span></div>
    </div>
    <div class="th-alert th-alert--warning"><p>Tenés un tiempo limitado para completar el pago. Si no lo hacés antes del vencimiento, la oferta se cancela automáticamente.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Completar pago</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },

      // OFFER_REJECTED (buyer: link to My offers so they can see the offer and try again or buy at list price)
      {
        eventType: NotificationEventType.OFFER_REJECTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Oferta rechazada',
        bodyTemplate:
          'Tu oferta para "{{eventName}}" fue rechazada por el vendedor',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_REJECTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Tu oferta para "{{eventName}}" fue rechazada',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--neutral">&#8212;</div>
    <h1 class="th-title">Tu oferta no fue aceptada</h1>
    <p class="th-text">El vendedor decidió no aceptar la oferta para las entradas de <strong>{{eventName}}</strong>.</p>
    <p class="th-text">Podés buscar otras opciones disponibles para el mismo evento o hacer una nueva oferta a otro vendedor.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">ID de oferta</span><span class="th-value">{{offerId}}</span></div>
    </div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver otras opciones</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },

      // OFFER_CANCELLED (buyer: link to My offers)
      {
        eventType: NotificationEventType.OFFER_CANCELLED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Oferta cancelada',
        bodyTemplate:
          'Tu oferta para "{{eventName}}" ya no está disponible. {{reason}}',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_CANCELLED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Tu oferta para "{{eventName}}" ya no está disponible',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--neutral">&#8212;</div>
    <h1 class="th-title">La oferta fue cancelada</h1>
    <p class="th-text">La oferta que realizaste para las entradas de <strong>{{eventName}}</strong> fue cancelada.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Motivo</span><span class="th-value">{{reason}}</span></div>
      <div class="th-row"><span class="th-label">ID de oferta</span><span class="th-value">{{offerId}}</span></div>
    </div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Buscar otras entradas</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },

      // OFFER_EXPIRED — BUYER
      {
        eventType: NotificationEventType.OFFER_EXPIRED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Oferta expirada',
        bodyTemplate:
          'Tu oferta para "{{eventName}}" expiró sin concretarse.',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_EXPIRED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'Tu oferta para "{{eventName}}" expiró',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--neutral">&#9201;</div>
    <h1 class="th-title">Tu oferta venció</h1>
    <p class="th-text">La oferta para las entradas de <strong>{{eventName}}</strong> venció sin completarse.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">Motivo</span><span class="th-value">{{expiredReason}}</span></div>
      <div class="th-row"><span class="th-label">ID de oferta</span><span class="th-value">{{offerId}}</span></div>
    </div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Buscar otras entradas</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },

      // OFFER_EXPIRED — SELLER
      {
        eventType: NotificationEventType.OFFER_EXPIRED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'Oferta sin concretar',
        bodyTemplate:
          'La oferta para "{{eventName}}" expiró sin que el comprador realizara el pago. Tu publicación sigue activa.',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_EXPIRED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        recipientRole: NotificationRecipientRole.SELLER,
        titleTemplate: 'La oferta para "{{eventName}}" expiró sin concretarse',
        bodyTemplate: `<div class="th-wrap">
  <div class="th-header"><span class="th-logo-text">Tickets<span>Hub</span></span></div>
  <div class="th-body">
    <div class="th-icon th-icon--neutral">&#9201;</div>
    <h1 class="th-title">Una oferta venció sin completarse</h1>
    <p class="th-text">El comprador aceptó tu oferta por las entradas de <strong>{{eventName}}</strong>, pero no completó el pago dentro del plazo establecido.</p>
    <div class="th-info-box">
      <div class="th-row"><span class="th-label">Evento</span><span class="th-value">{{eventName}}</span></div>
      <div class="th-row"><span class="th-label">ID de oferta</span><span class="th-value">{{offerId}}</span></div>
    </div>
    <div class="th-alert th-alert--info"><p>Tus entradas siguen disponibles. Podés recibir nuevas ofertas o ajustar el precio desde tu panel de vendedor.</p></div>
    <div class="th-btn-wrap"><a href="{{actionUrl}}" class="th-btn">Ver mi publicación</a></div>
  </div>
  <div class="th-footer">
    <p class="th-footer-brand">TicketsHub</p>
    <p>ticketshub.com.ar · <a href="mailto:hola@ticketshub.com.ar">hola@ticketshub.com.ar</a></p>
  </div>
</div>`,
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
    ];
  }
}
