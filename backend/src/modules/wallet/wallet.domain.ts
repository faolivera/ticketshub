import type { CurrencyCode } from '../shared/money.domain';

/**
 * Money representation for wallet
 */
export interface Money {
  amount: number; // in cents
  currency: CurrencyCode;
}

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
  reference: string; // e.g., transactionId
  description: string;
  createdAt: Date;
}
