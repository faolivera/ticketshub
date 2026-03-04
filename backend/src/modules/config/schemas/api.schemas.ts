import { z } from 'zod';

export const GetSellerPricingResponseSchema = z.object({
  sellerPlatformFeePercentage: z.number(),
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
});

export const UpdatePlatformConfigResponseSchema = GetPlatformConfigResponseSchema;
