import { Test, TestingModule } from '@nestjs/testing';
import { GatewayPaymentsService } from '../../../../src/modules/gateways/gateway-payments.service';
import { GATEWAY_ORDERS_REPOSITORY } from '../../../../src/modules/gateways/gateway-orders.repository.interface';
import { GATEWAY_REFUNDS_REPOSITORY } from '../../../../src/modules/gateways/gateway-refunds.repository.interface';
import { TransactionManager } from '../../../../src/common/database/transaction-manager';
import { TransactionsService } from '../../../../src/modules/transactions/transactions.service';
import { PaymentMethodsService } from '../../../../src/modules/payments/payment-methods.service';
import { UalaBisProvider } from '../../../../src/modules/gateways/providers/uala-bis.provider';
import { MercadoPagoProvider } from '../../../../src/modules/gateways/providers/mercadopago.provider';
import type { PaymentMethodOption } from '../../../../src/modules/payments/payments.domain';
import type { Ctx } from '../../../../src/common/types/context';

const mockCtx: Ctx = { source: 'HTTP', requestId: 'test-req' };

const mockMpPaymentMethod: PaymentMethodOption = {
  id: 'pm_mp1',
  name: 'MercadoPago',
  publicName: 'Tarjeta / MP',
  type: 'payment_gateway',
  status: 'enabled',
  visible: true,
  buyerCommissionPercent: 12,
  gatewayProvider: 'mercadopago',
  gatewayConfigEnvPrefix: 'MERCADOPAGO_MAIN',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GatewayPaymentsService', () => {
  let service: GatewayPaymentsService;
  let paymentMethodsService: jest.Mocked<Pick<PaymentMethodsService, 'findEnabled'>>;
  let mercadoPagoProvider: jest.Mocked<Pick<MercadoPagoProvider, 'fetchMerchantOrderPreferenceId'>>;

  beforeEach(async () => {
    paymentMethodsService = { findEnabled: jest.fn() };
    mercadoPagoProvider = { fetchMerchantOrderPreferenceId: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayPaymentsService,
        { provide: TransactionManager, useValue: { executeInTransaction: jest.fn() } },
        { provide: TransactionsService, useValue: {} },
        { provide: PaymentMethodsService, useValue: paymentMethodsService },
        { provide: UalaBisProvider, useValue: {} },
        { provide: MercadoPagoProvider, useValue: mercadoPagoProvider },
        { provide: GATEWAY_ORDERS_REPOSITORY, useValue: {} },
        { provide: GATEWAY_REFUNDS_REPOSITORY, useValue: {} },
      ],
    }).compile();

    service = module.get<GatewayPaymentsService>(GatewayPaymentsService);
  });

  // ── handleMercadoPagoMerchantOrderWebhook ─────────────────────────────────

  describe('handleMercadoPagoMerchantOrderWebhook', () => {
    it('resolves preferenceId from merchant order and calls handleOrderUpdate', async () => {
      paymentMethodsService.findEnabled.mockResolvedValue([mockMpPaymentMethod]);
      mercadoPagoProvider.fetchMerchantOrderPreferenceId.mockResolvedValue('pref_abc');
      const handleOrderUpdateSpy = jest
        .spyOn(service, 'handleOrderUpdate')
        .mockResolvedValue(undefined);

      await service.handleMercadoPagoMerchantOrderWebhook(mockCtx, '39519903870');

      expect(mercadoPagoProvider.fetchMerchantOrderPreferenceId).toHaveBeenCalledWith(
        mockCtx,
        '39519903870',
        mockMpPaymentMethod,
      );
      expect(handleOrderUpdateSpy).toHaveBeenCalledWith(mockCtx, 'pref_abc');
    });

    it('does nothing when no enabled MercadoPago payment method exists', async () => {
      paymentMethodsService.findEnabled.mockResolvedValue([]);
      const handleOrderUpdateSpy = jest
        .spyOn(service, 'handleOrderUpdate')
        .mockResolvedValue(undefined);

      await service.handleMercadoPagoMerchantOrderWebhook(mockCtx, '39519903870');

      expect(mercadoPagoProvider.fetchMerchantOrderPreferenceId).not.toHaveBeenCalled();
      expect(handleOrderUpdateSpy).not.toHaveBeenCalled();
    });

    it('propagates error when fetchMerchantOrderPreferenceId throws', async () => {
      paymentMethodsService.findEnabled.mockResolvedValue([mockMpPaymentMethod]);
      mercadoPagoProvider.fetchMerchantOrderPreferenceId.mockRejectedValue(
        new Error('MP fetch merchant order failed: 500'),
      );

      await expect(
        service.handleMercadoPagoMerchantOrderWebhook(mockCtx, '39519903870'),
      ).rejects.toThrow('MP fetch merchant order failed: 500');
    });
  });
});
