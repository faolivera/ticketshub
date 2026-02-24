import type { Wallet, WalletTransaction, Money } from './wallet.domain';

/**
 * Response for getting wallet
 */
export type GetWalletResponse = Wallet;

/**
 * Response for listing wallet transactions
 */
export type ListWalletTransactionsResponse = WalletTransaction[];

/**
 * Request for withdrawal
 */
export interface WithdrawRequest {
  amount: Money;
}

/**
 * Response after withdrawal request
 */
export interface WithdrawResponse {
  success: boolean;
  message: string;
  newBalance: Money;
}
