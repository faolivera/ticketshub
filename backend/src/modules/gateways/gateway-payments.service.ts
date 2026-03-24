import { Injectable, Inject, forwardRef, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type { TxCtx } from '../../common/database/types';
import { TransactionManager } from '../../common/database/transaction-manager';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionStatus } from '../transactions/transactions.domain';
import { PaymentMethodsService } from '../payments/payment-methods.service';
import type { PaymentMethodOption } from '../payments/payments.domain';
import { UalaBisProvider } from './providers/uala-bis.provider';
import { MercadoPagoProvider } from './providers/mercadopago.provider';
import type { GatewayProvider } from './providers/gateway-provider.interface';
import type { GatewayProviderMoney } from './providers/gateway-provider.interface';
import type { GatewayOrderRecord, GatewayRefundRecord } from './gateways.domain';
import {
  GATEWAY_ORDERS_REPOSITORY,
  type IGatewayOrdersRepository,
} from './gateway-orders.repository.interface';
import {
  GATEWAY_REFUNDS_REPOSITORY,
  type IGatewayRefundsRepository,
} from './gateway-refunds.repository.interface';

@Injectable()
export class GatewayPaymentsService {
  private readonly logger = new ContextLogger(GatewayPaymentsService.name);

  constructor(
    private readonly txManager: TransactionManager,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly ualaBisProvider: UalaBisProvider,
    private readonly mercadoPagoProvider: MercadoPagoProvider,
    @Inject(GATEWAY_ORDERS_REPOSITORY)
    private readonly gatewayOrdersRepo: IGatewayOrdersRepository,
    @Inject(GATEWAY_REFUNDS_REPOSITORY)
    private readonly gatewayRefundsRepo: IGatewayRefundsRepository,
  ) {}

  // ==================== createOrder ====================

  /**
   * Create a payment order at the provider and persist a GatewayOrder record.
   * Must be called OUTSIDE a DB transaction (makes a network call).
   * Returns the checkout URL to redirect the buyer.
   */
  async createOrder(
    ctx: Ctx,
    transactionId: string,
    amount: GatewayProviderMoney,
    description: string,
    paymentMethod: PaymentMethodOption,
  ): Promise<{ providerOrderId: string; checkoutUrl: string }> {
    const provider = this.getProvider(paymentMethod);

    // Network call — outside DB transaction
    const { providerOrderId, checkoutUrl } = await provider.createOrder(
      ctx,
      transactionId,
      amount,
      description,
      paymentMethod,
    );

    const order: GatewayOrderRecord = {
      id: this.generateId('go'),
      transactionId,
      paymentMethodId: paymentMethod.id,
      provider: paymentMethod.gatewayProvider ?? 'unknown',
      providerOrderId,
      checkoutUrl,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      await this.gatewayOrdersRepo.create(txCtx, order);
    });

    this.logger.log(
      ctx,
      `Gateway order created: ${providerOrderId} for transaction ${transactionId}`,
    );
    return { providerOrderId, checkoutUrl };
  }

  // ==================== handleOrderUpdate ====================

  /**
   * Process a provider status update (from webhook or polling).
   * Uses SELECT FOR UPDATE to prevent double-processing races.
   */
  async handleOrderUpdate(ctx: Ctx, providerOrderId: string): Promise<void> {
    await this.txManager.executeInTransaction(ctx, async (txCtx) => {
      const order = await this.gatewayOrdersRepo.findByProviderOrderIdForUpdate(
        txCtx,
        providerOrderId,
      );
      if (!order) {
        throw new NotFoundException(`Gateway order not found: ${providerOrderId}`);
      }

      // Idempotency: skip if already in a terminal state
      if (this.isTerminalOrderStatus(order.status)) {
        this.logger.log(ctx, `Order ${providerOrderId} already terminal (${order.status}), skipping`);
        return;
      }

      const paymentMethod = await this.paymentMethodsService.findById(ctx, order.paymentMethodId);
      if (!paymentMethod) {
        throw new NotFoundException(`Payment method ${order.paymentMethodId} not found`);
      }
      const provider = this.getProvider(paymentMethod);

      // Network call while holding the row lock — prevents double-processing
      const providerStatus = await provider.getOrder(ctx, providerOrderId, paymentMethod);

      if (providerStatus === 'pending') {
        // Not resolved yet
        return;
      }

      if (providerStatus === 'approved') {
        await this.handleApproved(txCtx, order, paymentMethod);
      } else if (providerStatus === 'rejected') {
        await this.handleRejected(txCtx, order);
      } else if (providerStatus === 'refunded' || providerStatus === 'cancelled') {
        await this.gatewayOrdersRepo.updateStatus(txCtx, order.id, providerStatus);
        this.logger.log(ctx, `Order ${providerOrderId} → ${providerStatus}`);
      }
    });
  }

  // ==================== pollPendingOrders ====================

  /**
   * Poll all pending gateway orders and process any resolved ones.
   * Called by GatewayPaymentsScheduler on a cron interval.
   * Returns the number of orders processed.
   */
  async pollPendingOrders(ctx: Ctx): Promise<number> {
    const pendingOrders = await this.gatewayOrdersRepo.findPendingOrders(ctx);
    let processed = 0;
    for (const order of pendingOrders) {
      await this.handleOrderUpdate(ctx, order.providerOrderId).catch((err) => {
        this.logger.error(ctx, `Poll failed for order ${order.providerOrderId}`, err);
      });
      processed++;
    }
    return processed;
  }

  // ==================== handleMercadoPagoWebhook ====================

  /**
   * Process a MercadoPago webhook notification.
   * MP sends a paymentId — we fetch the payment to get the preferenceId,
   * then hand off to the standard handleOrderUpdate flow.
   * Must be called OUTSIDE a DB transaction (makes a network call).
   */
  async handleMercadoPagoWebhook(ctx: Ctx, paymentId: string): Promise<void> {
    const enabledMethods = await this.paymentMethodsService.findEnabled(ctx);
    const mpMethod = enabledMethods.find((m) => m.gatewayProvider === 'mercadopago');

    if (!mpMethod) {
      this.logger.error(ctx, `MP webhook received but no enabled MercadoPago payment method found`);
      return;
    }

    const { preferenceId } = await this.mercadoPagoProvider.fetchPayment(ctx, paymentId, mpMethod);
    this.logger.log(ctx, `MP webhook: paymentId ${paymentId} → preferenceId ${preferenceId}`);

    await this.handleOrderUpdate(ctx, preferenceId);
  }

  // ==================== handleTransactionCancelled ====================

  /**
   * Update the GatewayOrder to 'cancelled' when the transaction is cancelled.
   * Must be called from WITHIN cancelTransaction's executeInTransaction (receives TxCtx).
   */
  async handleTransactionCancelled(txCtx: TxCtx, transactionId: string): Promise<void> {
    const order = await this.gatewayOrdersRepo.findByTransactionId(txCtx, transactionId);
    if (!order) {
      // Not a gateway transaction — no-op
      return;
    }
    if (this.isTerminalOrderStatus(order.status)) {
      return;
    }
    await this.gatewayOrdersRepo.updateStatus(txCtx, order.id, 'cancelled');
    this.logger.log(
      txCtx,
      `Gateway order ${order.providerOrderId} cancelled for transaction ${transactionId}`,
    );
  }

  // ==================== Helpers ====================

  getProvider(paymentMethod: PaymentMethodOption): GatewayProvider {
    switch (paymentMethod.gatewayProvider) {
      case 'uala_bis':
        return this.ualaBisProvider;
      case 'mercadopago':
        return this.mercadoPagoProvider;
      default:
        throw new BadRequestException(
          `Unsupported gateway provider: ${paymentMethod.gatewayProvider ?? 'none'}`,
        );
    }
  }

  private isTerminalOrderStatus(status: string): boolean {
    return ['approved', 'rejected', 'refunded', 'cancelled'].includes(status);
  }

  private async handleApproved(
    txCtx: TxCtx,
    order: GatewayOrderRecord,
    paymentMethod: PaymentMethodOption,
  ): Promise<void> {
    await this.gatewayOrdersRepo.updateStatus(txCtx, order.id, 'approved');

    const transaction = await this.transactionsService.findById(txCtx, order.transactionId);

    if (transaction?.status === TransactionStatus.Cancelled) {
      // Late approval: transaction already cancelled — issue refund
      const refund: GatewayRefundRecord = {
        id: this.generateId('gr'),
        transactionId: order.transactionId,
        gatewayOrderId: order.id,
        providerOrderId: order.providerOrderId,
        paymentMethodId: paymentMethod.id,
        provider: order.provider,
        amount: transaction.totalPaid.amount,
        currency: transaction.totalPaid.currency,
        status: 'Pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.gatewayRefundsRepo.create(txCtx, refund);
      this.logger.log(txCtx, `Late approval for transaction ${order.transactionId} — refund queued`);
    } else {
      await this.transactionsService.handlePaymentReceived(txCtx, order.transactionId);
      this.logger.log(txCtx, `Order ${order.providerOrderId} approved — payment received`);
    }
  }

  private async handleRejected(
    txCtx: TxCtx,
    order: GatewayOrderRecord,
  ): Promise<void> {
    await this.gatewayOrdersRepo.updateStatus(txCtx, order.id, 'rejected');

    const transaction = await this.transactionsService.findById(txCtx, order.transactionId);
    const cancellableStatuses: string[] = [
      TransactionStatus.PendingPayment,
      TransactionStatus.PaymentPendingVerification,
    ];
    if (transaction && cancellableStatuses.includes(transaction.status)) {
      await this.transactionsService.handlePaymentFailed(txCtx, order.transactionId);
    }
    this.logger.log(txCtx, `Order ${order.providerOrderId} rejected`);
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }
}
