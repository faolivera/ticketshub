export type GatewayOrderStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'refunded'
  | 'cancelled';

export interface GatewayOrderRecord {
  id: string;
  transactionId: string;
  paymentMethodId: string;
  provider: string;
  providerOrderId: string;
  checkoutUrl: string;
  status: GatewayOrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface GatewayRefundRecord {
  id: string;
  transactionId: string;
  gatewayOrderId: string;
  providerOrderId: string;
  paymentMethodId: string;
  provider: string;
  amount: number; // cents
  currency: string;
  status: 'Pending' | 'Processing' | 'Processed' | 'Failed';
  apiCallLog?: GatewayApiCallLog;
  createdAt: Date;
  updatedAt: Date;
}

export interface GatewayApiCallLog {
  timestamp: string;
  endpoint: string;
  requestBody: Record<string, unknown>;
  responseBody: Record<string, unknown>;
  httpStatus: number;
}
