import { z } from 'zod';

const MoneySchema = z.object({
  amount: z.number(),
  currency: z.string(),
});

export const AdminPaymentItemSchema = z.object({
  // Payment confirmation data
  id: z.string(),
  transactionId: z.string(),
  uploadedBy: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  status: z.string(),
  createdAt: z.coerce.date(),
  reviewedAt: z.coerce.date().optional(),
  adminNotes: z.string().optional(),

  // Transaction enrichment
  buyerName: z.string(),
  sellerName: z.string(),
  eventName: z.string(),
  transactionAmount: z.number(),
  transactionCurrency: z.string(),

  // Additional transaction details
  listingId: z.string(),
  quantity: z.number(),
  pricePerUnit: MoneySchema,
  sellerFee: MoneySchema,
  buyerFee: MoneySchema,
});

export const AdminPaymentsResponseSchema = z.object({
  payments: z.array(AdminPaymentItemSchema),
  total: z.number(),
});

export const AdminPendingEventDateItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  date: z.coerce.date(),
  startTime: z.coerce.date().optional(),
  status: z.string(),
  pendingListingsCount: z.number(),
  createdAt: z.coerce.date(),
});

export const AdminPendingEventItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  venue: z.string(),
  category: z.string(),
  status: z.string(),
  createdAt: z.coerce.date(),
  pendingDates: z.array(AdminPendingEventDateItemSchema),
  pendingListingsCount: z.number(),
});

export const AdminPendingEventsResponseSchema = z.object({
  events: z.array(AdminPendingEventItemSchema),
  total: z.number(),
});
