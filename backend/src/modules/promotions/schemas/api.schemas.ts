import { z } from 'zod';

const PromotionTypeSchema = z.enum([
  'SELLER_DISCOUNTED_FEE',
  'BUYER_DISCOUNTED_FEE',
]);
const PromotionStatusSchema = z.enum(['active', 'inactive']);

export const CreatePromotionRequestSchema = z
  .object({
    name: z.string().min(1),
    type: PromotionTypeSchema,
    config: z.object({ feePercentage: z.number().min(0).max(100) }),
    maxUsages: z.number().int().min(0),
    validUntil: z.string().datetime().optional().nullable(),
    userIds: z.array(z.string().uuid()).optional(),
    emails: z.array(z.string().email()).optional(),
  })
  .refine(
    (data) => (data.userIds?.length ?? 0) > 0 || (data.emails?.length ?? 0) > 0,
    {
      message:
        'Either userIds or emails must be provided with at least one value',
    },
  );

export const UpdatePromotionStatusRequestSchema = z.object({
  status: PromotionStatusSchema,
});

export type CreatePromotionRequestInput = z.infer<
  typeof CreatePromotionRequestSchema
>;
export type UpdatePromotionStatusRequestInput = z.infer<
  typeof UpdatePromotionStatusRequestSchema
>;
