import { z } from 'zod';

export const SendOTPResponseSchema = z.object({
  message: z.string(),
  expiresAt: z.coerce.date(),
});

export const VerifyOTPResponseSchema = z.object({
  verified: z.boolean(),
  message: z.string(),
});
