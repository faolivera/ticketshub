import { z } from 'zod';
import { CurrencyCodeSchema } from '../../users/schemas/api.schemas';

const MoneySchema = z.object({
  amount: z.number(),
  currency: CurrencyCodeSchema,
});

const OfferSeatSchema = z.object({
  row: z.string(),
  seatNumber: z.string(),
});

const NumberedOfferTicketsSchema = z.object({
  type: z.literal('numbered'),
  seats: z.array(OfferSeatSchema).min(1),
});

const UnnumberedOfferTicketsSchema = z.object({
  type: z.literal('unnumbered'),
  count: z.number().int().min(1),
});

const OfferTicketsSchema = z.discriminatedUnion('type', [
  NumberedOfferTicketsSchema,
  UnnumberedOfferTicketsSchema,
]);

export const CreateOfferRequestSchema = z.object({
  listingId: z.string(),
  offeredPrice: MoneySchema,
  tickets: OfferTicketsSchema,
});

export type CreateOfferRequestInput = z.infer<typeof CreateOfferRequestSchema>;
