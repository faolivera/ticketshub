import type { Money } from './common';

/**
 * Wallet entity - each user has one wallet
 */
export interface Wallet {
  userId: string;
  balance: Money;
  pendingBalance: Money; // In escrow, waiting to be released
  updatedAt: Date;
}

/**
 * Wallet transaction type
 */
export enum WalletTransactionType {
  /**
   * Money added to wallet (e.g., from refund)
   */
  Credit = 'credit',

  /**
   * Money removed from wallet (e.g., withdrawal)
   */
  Debit = 'debit',

  /**
   * Money held in escrow (pending release)
   */
  Hold = 'hold',

  /**
   * Money released from escrow to balance
   */
  Release = 'release',
}

/**
 * Wallet transaction entity - tracks all wallet movements
 */
export interface WalletTransaction {
  id: string;
  walletUserId: string;
  type: WalletTransactionType;
  amount: Money;
  reference: string;
  description: string;
  createdAt: Date;
}

// === API Types ===

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
