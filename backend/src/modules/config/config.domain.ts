import type { CurrencyCode } from '../shared/money.domain';

/**
 * Money value (amount in minor units e.g. cents, currency).
 */
export interface Money {
  amount: number;
  currency: CurrencyCode;
}

/**
 * Buyer-facing risk config: when to require V2 (phone) and V3 (DNI) at checkout.
 * Same condition types for both; DNI thresholds are typically stricter (e.g. higher amount, fewer hours).
 * Amount thresholds are Money (USD or ARS only); comparison uses ConversionService with configured exchange rate.
 */
export interface RiskEngineBuyerConfig {
  phoneRequiredEventHours: number;
  /** Require phone when order total >= this amount (USD or ARS). */
  phoneRequiredAmount: Money;
  phoneRequiredQtyTickets: number;
  newAccountDays: number;
  /** Event within N hours → require V3 (and V2). Stricter than phone. */
  dniRequiredEventHours: number;
  /** Require DNI when order total >= this amount (USD or ARS). */
  dniRequiredAmount: Money;
  /** Quantity >= N tickets → require V3 (and V2). */
  dniRequiredQtyTickets: number;
  /** Account age < N days → require V3 (and V2). */
  dniNewAccountDays: number;
}

/**
 * Seller-facing risk config: Tier 0 limits and payout hold.
 */
export interface RiskEngineSellerConfig {
  unverifiedSellerMaxSales: number;
  /** Max total sales amount for Tier 0 sellers; use ConversionService to compare with seller totals. */
  unverifiedSellerMaxAmount: Money;
  payoutHoldHoursDefault: number;
  payoutHoldHoursUnverified: number;
}

/**
 * Time window for one claim type: claim can only be opened when
 * refDate + minimumClaimHours <= now <= refDate + maximumClaimHours.
 */
export interface ClaimTypeWindowConfig {
  minimumClaimHours: number;
  maximumClaimHours: number;
}

/**
 * Claims / disputes config: time window per claim type (TicketNotReceived, TicketDidntWork).
 */
export interface RiskEngineClaimsConfig {
  ticketNotReceived: ClaimTypeWindowConfig;
  ticketDidntWork: ClaimTypeWindowConfig;
}

/**
 * Risk engine and verification-related config, grouped by buyer / seller / claims.
 */
export interface RiskEngineConfig {
  buyer: RiskEngineBuyerConfig;
  seller: RiskEngineSellerConfig;
  claims: RiskEngineClaimsConfig;
}

/**
 * Exchange rates for currency conversion (admin-configured).
 * e.g. usdToArs = 1000 means 1 USD = 1000 ARS.
 */
export interface ExchangeRatesConfig {
  usdToArs: number;
}

/**
 * Platform configuration domain.
 * Values are stored in DB (singleton) and can be overridden by admin; HOCON provides defaults when no row exists.
 */
export interface PlatformConfig {
  buyerPlatformFeePercentage: number;
  sellerPlatformFeePercentage: number;
  paymentTimeoutMinutes: number;
  adminReviewTimeoutHours: number;
  /** Minutes until a pending offer expires (seller must accept/reject). */
  offerPendingExpirationMinutes: number;
  /** Minutes until an accepted offer expires (buyer must complete purchase). */
  offerAcceptedExpirationMinutes: number;
  /** Seconds between chat message polls on the transaction page. */
  transactionChatPollIntervalSeconds: number;
  /** Maximum number of chat messages per transaction. */
  transactionChatMaxMessages: number;
  /** Risk engine, seller limits, payout hold, and claim deadlines. Shown in its own section in admin. */
  riskEngine: RiskEngineConfig;
  /** Exchange rates for ConversionService (e.g. USD -> ARS). */
  exchangeRates: ExchangeRatesConfig;
}

export const PLATFORM_CONFIG_DEFAULT_ID = 'default';
