import { Injectable, Inject } from '@nestjs/common';
import { ContextLogger } from '../../common/logger/context-logger';
import type { Ctx } from '../../common/types/context';
import { PaymentMethodsService } from '../payments/payment-methods.service';
import { GatewayPaymentsService } from './gateway-payments.service';
import type { GatewayApiCallLog } from './gateways.domain';
import {
  GATEWAY_REFUNDS_REPOSITORY,
  type IGatewayRefundsRepository,
} from './gateway-refunds.repository.interface';

@Injectable()
export class GatewayRefundsService {
  private readonly logger = new ContextLogger(GatewayRefundsService.name);

  constructor(
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly gatewayPaymentsService: GatewayPaymentsService,
    @Inject(GATEWAY_REFUNDS_REPOSITORY)
    private readonly gatewayRefundsRepo: IGatewayRefundsRepository,
  ) {}

  /**
   * Process all pending refunds.
   * Each refund calls the provider's refundOrder API and logs the result.
   * Failed refunds are left in 'Failed' status for manual review (no auto-retry).
   */
  async processPendingRefunds(ctx: Ctx): Promise<number> {
    const pendingRefunds = await this.gatewayRefundsRepo.findPendingRefunds(ctx);
    let processed = 0;

    for (const refund of pendingRefunds) {
      await this.gatewayRefundsRepo.updateStatus(ctx, refund.id, 'Processing');

      const timestamp = new Date().toISOString();
      const endpoint = `/orders/${refund.providerOrderId}/refund`;

      try {
        const paymentMethod = await this.paymentMethodsService.findById(
          ctx,
          refund.paymentMethodId,
        );
        if (!paymentMethod) {
          throw new Error(`Payment method ${refund.paymentMethodId} not found`);
        }

        const provider = this.gatewayPaymentsService.getProvider(paymentMethod);

        const requestBody = {
          amount: (refund.amount / 100).toFixed(2),
          currency: refund.currency,
        };

        await provider.refundOrder(
          ctx,
          refund.providerOrderId,
          { amount: refund.amount, currency: refund.currency },
          paymentMethod,
        );

        const apiCallLog: GatewayApiCallLog = {
          timestamp,
          endpoint,
          requestBody,
          responseBody: { status: 'accepted' },
          httpStatus: 200,
        };

        await this.gatewayRefundsRepo.updateStatus(ctx, refund.id, 'Processed', apiCallLog);
        this.logger.log(
          ctx,
          `Refund ${refund.id} processed for order ${refund.providerOrderId}`,
        );
      } catch (err) {
        const apiCallLog: GatewayApiCallLog = {
          timestamp,
          endpoint,
          requestBody: {
            amount: (refund.amount / 100).toFixed(2),
            currency: refund.currency,
          },
          responseBody: { error: String(err) },
          httpStatus: 0,
        };

        await this.gatewayRefundsRepo
          .updateStatus(ctx, refund.id, 'Failed', apiCallLog)
          .catch((updateErr) => {
            this.logger.error(ctx, `Failed to mark refund ${refund.id} as Failed`, updateErr);
          });

        this.logger.error(
          ctx,
          `Refund ${refund.id} failed for order ${refund.providerOrderId}`,
          err,
        );
      }

      processed++;
    }

    return processed;
  }

}
