import { z } from 'zod';

export const GetSellerPricingResponseSchema = z.object({
  sellerPlatformFeePercentage: z.number(),
});

export const GetPlatformConfigResponseSchema = z.object({
  buyerPlatformFeePercentage: z.number(),
  sellerPlatformFeePercentage: z.number(),
  paymentTimeoutMinutes: z.number(),
  adminReviewTimeoutHours: z.number(),
});

export const UpdatePlatformConfigRequestSchema = z.object({
  buyerPlatformFeePercentage: z.number().min(0).max(100).optional(),
  sellerPlatformFeePercentage: z.number().min(0).max(100).optional(),
  paymentTimeoutMinutes: z.number().min(1).max(1440).optional(),
  adminReviewTimeoutHours: z.number().min(1).max(168).optional(),
});

export const UpdatePlatformConfigResponseSchema = GetPlatformConfigResponseSchema;
