import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PaymentsRepository } from './payments.repository';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import type {
  PaymentIntent,
  Money,
  PaymentMetadata,
  WebhookResult,
  PaymentProvider,
  PayoutProvider,
  PayoutResult,
} from './payments.domain';
import { PaymentStatus } from './payments.domain';

/**
 * Mock payment provider for development
 * In production, replace with actual provider integration (Stripe, PayPal, etc.)
 */
@Injectable()
export class PaymentsService implements PaymentProvider, PayoutProvider {
  private readonly logger = new ContextLogger(PaymentsService.name);

  constructor(
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  /**
   * Generate a unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    ctx: Ctx,
    transactionId: string,
    amount: Money,
    metadata: PaymentMetadata,
  ): Promise<PaymentIntent> {
    this.logger.log(
      ctx,
      `Creating payment intent for transaction ${transactionId}`,
    );

    const paymentIntent: PaymentIntent = {
      id: this.generateId('pi'),
      transactionId,
      amount,
      status: PaymentStatus.Pending,
      providerPaymentId: this.generateId('mock_pi'), // Mock provider ID
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.paymentsRepository.create(ctx, paymentIntent);

    this.logger.log(ctx, `Payment intent ${paymentIntent.id} created`);
    return paymentIntent;
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(ctx: Ctx, id: string): Promise<PaymentIntent> {
    const payment = await this.paymentsRepository.findById(ctx, id);
    if (!payment) {
      throw new NotFoundException('Payment intent not found');
    }
    return payment;
  }

  /**
   * Get payment intent by transaction ID
   */
  async getPaymentByTransactionId(
    ctx: Ctx,
    transactionId: string,
  ): Promise<PaymentIntent | undefined> {
    return await this.paymentsRepository.findByTransactionId(
      ctx,
      transactionId,
    );
  }

  /**
   * Confirm a payment (mock - in production this would be handled by provider webhook)
   */
  async confirmPayment(
    ctx: Ctx,
    paymentIntentId: string,
  ): Promise<PaymentIntent> {
    this.logger.log(ctx, `Confirming payment ${paymentIntentId}`);

    const updated = await this.paymentsRepository.update(ctx, paymentIntentId, {
      status: PaymentStatus.Succeeded,
    });

    if (!updated) {
      throw new NotFoundException('Payment intent not found');
    }

    this.logger.log(ctx, `Payment ${paymentIntentId} confirmed`);
    return updated;
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(
    ctx: Ctx,
    paymentIntentId: string,
  ): Promise<PaymentIntent> {
    this.logger.log(ctx, `Cancelling payment ${paymentIntentId}`);

    const updated = await this.paymentsRepository.update(ctx, paymentIntentId, {
      status: PaymentStatus.Cancelled,
    });

    if (!updated) {
      throw new NotFoundException('Payment intent not found');
    }

    this.logger.log(ctx, `Payment ${paymentIntentId} cancelled`);
    return updated;
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    ctx: Ctx,
    paymentIntentId: string,
    amount?: Money,
  ): Promise<PaymentIntent> {
    this.logger.log(ctx, `Refunding payment ${paymentIntentId}`);

    const payment = await this.paymentsRepository.findById(
      ctx,
      paymentIntentId,
    );
    if (!payment) {
      throw new NotFoundException('Payment intent not found');
    }

    // In production, call payment provider's refund API
    const updated = await this.paymentsRepository.update(ctx, paymentIntentId, {
      status: PaymentStatus.Refunded,
    });

    if (!updated) {
      throw new NotFoundException('Payment intent not found');
    }

    this.logger.log(ctx, `Payment ${paymentIntentId} refunded`);
    return updated;
  }

  /**
   * Process webhook from payment provider
   */
  async processWebhook(
    ctx: Ctx,
    payload: unknown,
    _signature?: string,
  ): Promise<WebhookResult> {
    this.logger.log(ctx, `Processing webhook`);

    try {
      // In production, validate webhook signature and parse provider-specific payload
      const event = payload as {
        type: string;
        paymentIntentId: string;
        status: PaymentStatus;
      };

      const payment = await this.paymentsRepository.findByProviderPaymentId(
        ctx,
        event.paymentIntentId,
      );
      if (!payment) {
        return { processed: false, error: 'Payment not found' };
      }

      await this.paymentsRepository.update(ctx, payment.id, {
        status: event.status,
      });

      this.logger.log(ctx, `Webhook processed for payment ${payment.id}`);
      return { processed: true, transactionId: payment.transactionId };
    } catch (error) {
      this.logger.error(ctx, `Webhook processing failed: ${error}`);
      return { processed: false, error: String(error) };
    }
  }

  /**
   * Create payout to seller's bank account
   */
  async createPayout(
    ctx: Ctx,
    userId: string,
    amount: Money,
    bankAccountId: string,
  ): Promise<PayoutResult> {
    this.logger.log(ctx, `Creating payout for user ${userId}`);

    // Mock payout - in production, call payment provider's payout API
    const payoutId = this.generateId('po');

    this.logger.log(ctx, `Payout ${payoutId} created for user ${userId}`);

    return {
      success: true,
      payoutId,
    };
  }
}
