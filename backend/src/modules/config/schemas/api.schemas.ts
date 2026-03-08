import { z } from 'zod';

export const GetSellerPricingResponseSchema = z.object({
  sellerPlatformFeePercentage: z.number(),
});

const CurrencyCodeSchema = z.enum(['EUR', 'USD', 'GBP', 'ARS']);
const MoneySchema = z.object({
  amount: z.number().int(),
  currency: CurrencyCodeSchema,
});

/** Only USD and ARS allowed for buyer amount thresholds (conversion uses configured rate). */
const BuyerAmountCurrencySchema = z.enum(['USD', 'ARS']);
const BuyerAmountMoneySchema = z.object({
  amount: z.number().int(),
  currency: BuyerAmountCurrencySchema,
});

const RiskEngineBuyerConfigSchema = z.object({
  phoneRequiredEventHours: z.number(),
  phoneRequiredAmount: BuyerAmountMoneySchema,
  phoneRequiredQtyTickets: z.number(),
  newAccountDays: z.number(),
  dniRequiredEventHours: z.number(),
  dniRequiredAmount: BuyerAmountMoneySchema,
  dniRequiredQtyTickets: z.number(),
  dniNewAccountDays: z.number(),
});

const RiskEngineSellerConfigSchema = z.object({
  unverifiedSellerMaxSales: z.number(),
  unverifiedSellerMaxAmount: MoneySchema,
  payoutHoldHoursDefault: z.number(),
  payoutHoldHoursUnverified: z.number(),
});

const ClaimTypeWindowConfigSchema = z.object({
  minimumClaimHours: z.number(),
  maximumClaimHours: z.number(),
});

const RiskEngineClaimsConfigSchema = z.object({
  ticketNotReceived: ClaimTypeWindowConfigSchema,
  ticketDidntWork: ClaimTypeWindowConfigSchema,
});

const RiskEngineConfigSchema = z.object({
  buyer: RiskEngineBuyerConfigSchema,
  seller: RiskEngineSellerConfigSchema,
  claims: RiskEngineClaimsConfigSchema,
});

const ExchangeRatesConfigSchema = z.object({
  usdToArs: z.number(),
});

export const GetPlatformConfigResponseSchema = z.object({
  buyerPlatformFeePercentage: z.number(),
  sellerPlatformFeePercentage: z.number(),
  paymentTimeoutMinutes: z.number(),
  adminReviewTimeoutHours: z.number(),
  offerPendingExpirationMinutes: z.number(),
  offerAcceptedExpirationMinutes: z.number(),
  transactionChatPollIntervalSeconds: z.number(),
  transactionChatMaxMessages: z.number(),
  riskEngine: RiskEngineConfigSchema,
  exchangeRates: ExchangeRatesConfigSchema,
});

const OFFER_EXPIRATION_MIN = 1;
const OFFER_EXPIRATION_MAX = 10080; // 7 days in minutes

export const UpdatePlatformConfigRequestSchema = z.object({
  buyerPlatformFeePercentage: z.number().min(0).max(100).optional(),
  sellerPlatformFeePercentage: z.number().min(0).max(100).optional(),
  paymentTimeoutMinutes: z.number().min(1).max(1440).optional(),
  adminReviewTimeoutHours: z.number().min(1).max(168).optional(),
  offerPendingExpirationMinutes: z.number().min(OFFER_EXPIRATION_MIN).max(OFFER_EXPIRATION_MAX).optional(),
  offerAcceptedExpirationMinutes: z.number().min(OFFER_EXPIRATION_MIN).max(OFFER_EXPIRATION_MAX).optional(),
  transactionChatPollIntervalSeconds: z.number().min(5).max(120).optional(),
  transactionChatMaxMessages: z.number().min(10).max(500).optional(),
  riskEngine: z
    .object({
      buyer: z
        .object({
          phoneRequiredEventHours: z.number().min(1).max(720).optional(),
          phoneRequiredAmount: BuyerAmountMoneySchema.optional(),
          phoneRequiredQtyTickets: z.number().min(1).max(50).optional(),
          newAccountDays: z.number().min(0).max(365).optional(),
          dniRequiredEventHours: z.number().min(1).max(720).optional(),
          dniRequiredAmount: BuyerAmountMoneySchema.optional(),
          dniRequiredQtyTickets: z.number().min(1).max(50).optional(),
          dniNewAccountDays: z.number().min(0).max(365).optional(),
        })
        .optional(),
      seller: z
        .object({
          unverifiedSellerMaxSales: z.number().min(0).max(100).optional(),
          unverifiedSellerMaxAmount: MoneySchema.optional(),
          payoutHoldHoursDefault: z.number().min(0).max(168).optional(),
          payoutHoldHoursUnverified: z.number().min(0).max(168).optional(),
        })
        .optional(),
      claims: z
        .object({
          ticketNotReceived: z
            .object({
              minimumClaimHours: z.number().min(0).max(720).optional(),
              maximumClaimHours: z.number().min(1).max(720).optional(),
            })
            .optional(),
          ticketDidntWork: z
            .object({
              minimumClaimHours: z.number().min(0).max(720).optional(),
              maximumClaimHours: z.number().min(1).max(720).optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
  exchangeRates: z
    .object({
      usdToArs: z.number().min(1).max(1000000).optional(),
    })
    .optional(),
});

export const UpdatePlatformConfigResponseSchema = GetPlatformConfigResponseSchema;
