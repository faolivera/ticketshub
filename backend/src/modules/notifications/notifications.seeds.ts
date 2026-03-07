import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
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
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedChannelConfigs(ON_APP_INIT_CTX);
    await this.seedTemplates(ON_APP_INIT_CTX);
    // Sync so new templates (e.g. OFFER_RECEIVED) are created when getDefaultTemplates() is extended
    const sync = await this.syncTemplates(ON_APP_INIT_CTX);
    if (sync.created > 0 || sync.updated > 0) {
      this.logger.log(ON_APP_INIT_CTX, `Notification templates sync: ${sync.created} created, ${sync.updated} updated`);
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
    const existingEventTypes = new Set(existing.map(c => c.eventType));

    if (existingEventTypes.size >= Object.keys(NotificationEventType).length) {
      this.logger.log(ctx, `All channel configs already exist (${existing.length}), skipping seed`);
      return;
    }

    this.logger.log(ctx, 'Seeding missing channel configs...');

    const configs: Omit<NotificationChannelConfig, 'id'>[] = [
      { eventType: NotificationEventType.PAYMENT_REQUIRED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.BUYER_PAYMENT_SUBMITTED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.BUYER_PAYMENT_APPROVED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.NORMAL, updatedAt: new Date() },
      { eventType: NotificationEventType.BUYER_PAYMENT_REJECTED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.SELLER_PAYMENT_RECEIVED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.TICKET_TRANSFERRED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.TRANSACTION_COMPLETED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.NORMAL, updatedAt: new Date() },
      { eventType: NotificationEventType.TRANSACTION_CANCELLED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.TRANSACTION_EXPIRED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.DISPUTE_OPENED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.URGENT, updatedAt: new Date() },
      { eventType: NotificationEventType.DISPUTE_RESOLVED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.IDENTITY_VERIFIED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.NORMAL, updatedAt: new Date() },
      { eventType: NotificationEventType.IDENTITY_REJECTED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.IDENTITY_SUBMITTED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.BANK_ACCOUNT_SUBMITTED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.SELLER_VERIFICATION_COMPLETE, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.NORMAL, updatedAt: new Date() },
      { eventType: NotificationEventType.EVENT_APPROVED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.NORMAL, updatedAt: new Date() },
      { eventType: NotificationEventType.EVENT_REJECTED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.REVIEW_RECEIVED, inAppEnabled: true, emailEnabled: false, priority: NotificationPriority.LOW, updatedAt: new Date() },
      { eventType: NotificationEventType.OFFER_RECEIVED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.OFFER_ACCEPTED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH, updatedAt: new Date() },
      { eventType: NotificationEventType.OFFER_REJECTED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.NORMAL, updatedAt: new Date() },
      { eventType: NotificationEventType.OFFER_CANCELLED, inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.NORMAL, updatedAt: new Date() },
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

    this.logger.log(ctx, `Seeded ${seededCount} channel configs (${existing.length} already existed)`);
  }

  private async seedTemplates(ctx: Ctx): Promise<void> {
    const existing = await this.repository.findAllTemplates(ctx);
    if (existing.length > 0) {
      this.logger.log(ctx, `Templates already exist (${existing.length}), skipping seed`);
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

  private getDefaultTemplates(): Omit<NotificationTemplate, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>[] {
    return [
      // PAYMENT_REQUIRED
      {
        eventType: NotificationEventType.PAYMENT_REQUIRED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Pago pendiente',
        bodyTemplate: 'Tienes un pago pendiente de {{amountFormatted}} para "{{eventName}}"',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.PAYMENT_REQUIRED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Pago pendiente para "{{eventName}}"',
        bodyTemplate: 'Hola, tienes un pago pendiente de {{amountFormatted}} para el ticket de "{{eventName}}" de {{sellerName}}. El pago expira el {{expiresAt}}. Por favor realiza el pago para completar tu compra.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // BUYER_PAYMENT_SUBMITTED (notify admins; link to admin transactions)
      {
        eventType: NotificationEventType.BUYER_PAYMENT_SUBMITTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Nuevo pago recibido',
        bodyTemplate: '{{buyerName}} envió un comprobante de pago para "{{eventName}}"',
        actionUrlTemplate: '/admin/transactions',
      },
      {
        eventType: NotificationEventType.BUYER_PAYMENT_SUBMITTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Pago recibido para "{{eventName}}"',
        bodyTemplate: '{{buyerName}} ha enviado un comprobante de pago de {{amountFormatted}} para tu ticket de "{{eventName}}". Por favor revisa y confirma el pago.',
        actionUrlTemplate: '/admin/transactions',
      },

      // BUYER_PAYMENT_APPROVED (buyer and seller get different copy via processor variables)
      {
        eventType: NotificationEventType.BUYER_PAYMENT_APPROVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: '{{title}}',
        bodyTemplate: '{{body}}',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.BUYER_PAYMENT_APPROVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: '{{title}}',
        bodyTemplate: '{{body}}',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // BUYER_PAYMENT_REJECTED
      {
        eventType: NotificationEventType.BUYER_PAYMENT_REJECTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Pago rechazado',
        bodyTemplate: '{{sellerName}} rechazó tu pago para "{{eventName}}"',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.BUYER_PAYMENT_REJECTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Tu pago para "{{eventName}}" fue rechazado',
        bodyTemplate: 'Lamentablemente, {{sellerName}} ha rechazado tu pago para "{{eventName}}". Motivo: {{rejectionReason}}. Por favor contacta al vendedor o intenta nuevamente.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // SELLER_PAYMENT_RECEIVED
      {
        eventType: NotificationEventType.SELLER_PAYMENT_RECEIVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Pago disponible',
        bodyTemplate: 'El pago de {{amountFormatted}} por "{{eventName}}" ya está disponible. Transferí la entrada al comprador.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.SELLER_PAYMENT_RECEIVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Pago recibido - Transferí la entrada',
        bodyTemplate: 'El pago de {{amountFormatted}} por tu entrada de "{{eventName}}" ya está disponible en escrow. Por favor transferí la entrada al comprador para completar la venta.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // TICKET_TRANSFERRED (actionUrl points to the transaction with the transferred ticket)
      {
        eventType: NotificationEventType.TICKET_TRANSFERRED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: '¡Entrada transferida!',
        bodyTemplate: 'Has recibido tu entrada para "{{eventName}}". Por favor confirma que la recibiste para liberar el pago al vendedor.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.TICKET_TRANSFERRED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: '¡Tu entrada para "{{eventName}}" está listo!',
        bodyTemplate: '¡Felicidades! Has recibido tu entrada para "{{eventName}}" el {{eventDate}} en {{venue}}. Por favor confirma que la recibiste en la app para liberar el pago al vendedor.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // TRANSACTION_COMPLETED
      {
        eventType: NotificationEventType.TRANSACTION_COMPLETED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Venta completada',
        bodyTemplate: 'Tu venta de "{{eventName}}" se ha completado. Fondos liberados: {{amountFormatted}}',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.TRANSACTION_COMPLETED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Venta completada - Fondos liberados',
        bodyTemplate: 'Tu venta de "{{eventName}}" se ha completado. Fondos liberados: {{amountFormatted}}',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // TRANSACTION_CANCELLED
      {
        eventType: NotificationEventType.TRANSACTION_CANCELLED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Transacción cancelada',
        bodyTemplate: 'La transacción de "{{eventName}}" fue cancelada',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.TRANSACTION_CANCELLED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Transacción cancelada - "{{eventName}}"',
        bodyTemplate: 'La transacción de "{{eventName}}" fue cancelada por {{cancelledBy}}. Motivo: {{reason}}',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // TRANSACTION_EXPIRED
      {
        eventType: NotificationEventType.TRANSACTION_EXPIRED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Transacción expirada',
        bodyTemplate: 'La transacción de "{{eventName}}" ha expirado',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.TRANSACTION_EXPIRED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Transacción expirada - "{{eventName}}"',
        bodyTemplate: 'La transacción de "{{eventName}}" ha expirado debido a que no se completó el pago a tiempo.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // DISPUTE_OPENED
      {
        eventType: NotificationEventType.DISPUTE_OPENED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Nueva disputa abierta',
        bodyTemplate: 'Se ha abierto una disputa para "{{eventName}}"',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.DISPUTE_OPENED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Disputa abierta - "{{eventName}}"',
        bodyTemplate: 'Se ha abierto una disputa para la transacción de "{{eventName}}" por el {{openedBy}}. Motivo: {{reason}}. Nuestro equipo revisará el caso.',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // DISPUTE_RESOLVED
      {
        eventType: NotificationEventType.DISPUTE_RESOLVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Disputa resuelta',
        bodyTemplate: 'La disputa de "{{eventName}}" ha sido resuelta',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },
      {
        eventType: NotificationEventType.DISPUTE_RESOLVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Disputa resuelta - "{{eventName}}"',
        bodyTemplate: 'La disputa de "{{eventName}}" ha sido resuelta a favor del {{resolvedInFavorOf}}. Resolución: {{resolution}}',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // IDENTITY_VERIFIED
      {
        eventType: NotificationEventType.IDENTITY_VERIFIED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Identidad verificada',
        bodyTemplate: '¡Tu identidad ha sido verificada exitosamente!',
        actionUrlTemplate: '/user-profile',
      },
      {
        eventType: NotificationEventType.IDENTITY_VERIFIED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: '¡Tu identidad ha sido verificada!',
        bodyTemplate: '¡Felicidades {{userName}}! Tu identidad ha sido verificada exitosamente. Ahora puedes acceder a todas las funcionalidades de vendedor verificado.',
        actionUrlTemplate: '/user-profile',
      },

      // IDENTITY_REJECTED
      {
        eventType: NotificationEventType.IDENTITY_REJECTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Verificación rechazada',
        bodyTemplate: 'Tu solicitud de verificación de identidad fue rechazada',
        actionUrlTemplate: '/user-profile',
      },
      {
        eventType: NotificationEventType.IDENTITY_REJECTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Verificación de identidad rechazada',
        bodyTemplate: 'Hola {{userName}}, lamentablemente tu solicitud de verificación de identidad fue rechazada. Motivo: {{rejectionReason}}. Puedes volver a intentarlo corrigiendo los datos.',
        actionUrlTemplate: '/user-profile',
      },

      // IDENTITY_SUBMITTED (admin)
      {
        eventType: NotificationEventType.IDENTITY_SUBMITTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Documentos de identidad enviados',
        bodyTemplate: '{{userName}} ha enviado documentos para verificación de identidad.',
        actionUrlTemplate: '/admin/identity-verifications?verify=identity',
      },
      {
        eventType: NotificationEventType.IDENTITY_SUBMITTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Nueva solicitud de verificación de identidad',
        bodyTemplate: '{{userName}} ha enviado documentos para verificación. Revisa en el panel de administración.',
        actionUrlTemplate: '/admin/identity-verifications?verify=identity',
      },

      // BANK_ACCOUNT_SUBMITTED (admin)
      {
        eventType: NotificationEventType.BANK_ACCOUNT_SUBMITTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Datos bancarios enviados',
        bodyTemplate: '{{userName}} ha enviado datos bancarios para validación.',
        actionUrlTemplate: '/admin/identity-verifications?verify=bank',
      },
      {
        eventType: NotificationEventType.BANK_ACCOUNT_SUBMITTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Nuevos datos bancarios para validar',
        bodyTemplate: '{{userName}} ha enviado datos bancarios para validación. Revisa en el panel de administración.',
        actionUrlTemplate: '/admin/identity-verifications?verify=bank',
      },

      // SELLER_VERIFICATION_COMPLETE (seller)
      {
        eventType: NotificationEventType.SELLER_VERIFICATION_COMPLETE,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Verificación completa',
        bodyTemplate: '¡Felicidades {{userName}}! Tu identidad y datos bancarios han sido verificados. Ya puedes vender entradas.',
        actionUrlTemplate: '/sell-ticket',
      },
      {
        eventType: NotificationEventType.SELLER_VERIFICATION_COMPLETE,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: '¡Verificación de vendedor completa!',
        bodyTemplate: 'Hola {{userName}}, tu identidad y datos bancarios han sido aprobados. Ya puedes publicar y vender entradas en TicketsHub.',
        actionUrlTemplate: '/sell-ticket',
      },

      // EVENT_APPROVED
      {
        eventType: NotificationEventType.EVENT_APPROVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Evento aprobado',
        bodyTemplate: 'Tu evento "{{eventName}}" ha sido aprobado',
        actionUrlTemplate: '/event/{{eventId}}',
      },
      {
        eventType: NotificationEventType.EVENT_APPROVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Tu evento "{{eventName}}" ha sido aprobado',
        bodyTemplate: '¡Buenas noticias! Tu evento "{{eventName}}" ha sido aprobado y ya está visible para los usuarios.',
        actionUrlTemplate: '/event/{{eventId}}',
      },

      // EVENT_REJECTED
      {
        eventType: NotificationEventType.EVENT_REJECTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Evento rechazado',
        bodyTemplate: 'Tu evento "{{eventName}}" fue rechazado',
        actionUrlTemplate: '/event/{{eventId}}',
      },
      {
        eventType: NotificationEventType.EVENT_REJECTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Tu evento "{{eventName}}" fue rechazado',
        bodyTemplate: 'Lamentablemente tu evento "{{eventName}}" fue rechazado. Motivo: {{rejectionReason}}. Puedes editar el evento y volver a enviarlo.',
        actionUrlTemplate: '/event/{{eventId}}',
      },

      // REVIEW_RECEIVED
      {
        eventType: NotificationEventType.REVIEW_RECEIVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Nueva reseña recibida',
        bodyTemplate: '{{reviewerName}} te dejó una reseña de {{rating}} estrellas',
        actionUrlTemplate: '/transaction/{{transactionId}}',
      },

      // OFFER_RECEIVED (seller notified when someone makes an offer on their listing)
      {
        eventType: NotificationEventType.OFFER_RECEIVED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Nueva oferta recibida',
        bodyTemplate: 'Recibiste una oferta de {{amountFormatted}} para "{{eventName}}". Revisa y acepta o rechaza.',
        actionUrlTemplate: '/seller-dashboard?tab=received&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_RECEIVED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Nueva oferta en "{{eventName}}"',
        bodyTemplate: 'Alguien ofertó {{amountFormatted}} por tus entradas de "{{eventName}}". Entra a Mis anuncios para revisar y aceptar o rechazar.',
        actionUrlTemplate: '/seller-dashboard?tab=received&offerId={{offerId}}',
      },

      // OFFER_ACCEPTED (buyer notified when seller accepts their offer; link to My offers so they can open and complete purchase)
      {
        eventType: NotificationEventType.OFFER_ACCEPTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Oferta aceptada',
        bodyTemplate: 'Tu oferta de {{amountFormatted}} para "{{eventName}}" fue aceptada. Completa la compra antes de que expire.',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_ACCEPTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Tu oferta para "{{eventName}}" fue aceptada',
        bodyTemplate: 'Tu oferta de {{amountFormatted}} para "{{eventName}}" fue aceptada por el vendedor. Completa la compra antes de que expire.',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },

      // OFFER_REJECTED (buyer: link to My offers so they can see the offer and try again or buy at list price)
      {
        eventType: NotificationEventType.OFFER_REJECTED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Oferta rechazada',
        bodyTemplate: 'Tu oferta para "{{eventName}}" fue rechazada por el vendedor',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_REJECTED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Tu oferta para "{{eventName}}" fue rechazada',
        bodyTemplate: 'El vendedor rechazó tu oferta para "{{eventName}}". Puedes hacer otra oferta o comprar al precio publicado.',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },

      // OFFER_CANCELLED (buyer: link to My offers)
      {
        eventType: NotificationEventType.OFFER_CANCELLED,
        channel: NotificationChannel.IN_APP,
        locale: 'es',
        titleTemplate: 'Oferta cancelada',
        bodyTemplate: 'Tu oferta para "{{eventName}}" ya no está disponible. {{reason}}',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
      {
        eventType: NotificationEventType.OFFER_CANCELLED,
        channel: NotificationChannel.EMAIL,
        locale: 'es',
        titleTemplate: 'Tu oferta para "{{eventName}}" ya no está disponible',
        bodyTemplate: 'Tu oferta para "{{eventName}}" fue cancelada. {{reason}}',
        actionUrlTemplate: '/my-tickets?tab=offers&offerId={{offerId}}',
      },
    ];
  }
}
