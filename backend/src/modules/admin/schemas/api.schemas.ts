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

export const AdminPendingSectionItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventName: z.string(),
  name: z.string(),
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
  pendingSections: z.array(AdminPendingSectionItemSchema),
  pendingListingsCount: z.number(),
});

export const AdminPendingEventsResponseSchema = z.object({
  events: z.array(AdminPendingEventItemSchema),
  total: z.number(),
});

export const AdminApproveSectionRequestSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export const AdminApproveSectionResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  name: z.string(),
  status: z.string(),
  approvedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
});

// Admin Event Update Schemas

const AdminEventAddressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string().min(2).max(3),
});

const AdminEventDateUpdateSchema = z.object({
  id: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid ISO date string',
  }),
  doorsOpenAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date string',
    })
    .optional(),
  startTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date string',
    })
    .optional(),
  endTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date string',
    })
    .optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
});

export const AdminUpdateEventRequestSchema = z
  .object({
    name: z.string().min(3).max(200).optional(),
    description: z.string().min(10).max(5000).optional(),
    category: z
      .enum([
        'Concert',
        'Sports',
        'Theater',
        'Festival',
        'Conference',
        'Comedy',
        'Other',
      ])
      .optional(),
    venue: z.string().min(2).max(200).optional(),
    location: AdminEventAddressSchema.optional(),
    imageIds: z.array(z.string()).optional(),
    dates: z.array(AdminEventDateUpdateSchema).optional(),
    datesToDelete: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.dates) {
        for (const dateUpdate of data.dates) {
          const times = [
            dateUpdate.doorsOpenAt,
            dateUpdate.startTime,
            dateUpdate.endTime,
          ]
            .filter(Boolean)
            .map((t) => new Date(t!).getTime());

          for (let i = 0; i < times.length - 1; i++) {
            if (times[i] >= times[i + 1]) {
              return false;
            }
          }
        }
      }
      return true;
    },
    {
      message:
        'Time ordering must be: doorsOpenAt < startTime < endTime (when all provided)',
    },
  );

const AdminEventResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  venue: z.string(),
  location: AdminEventAddressSchema,
  imageIds: z.array(z.string()),
  status: z.string(),
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const AdminEventDateResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  date: z.coerce.date(),
  doorsOpenAt: z.coerce.date().optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  status: z.string(),
  createdBy: z.string(),
  approvedBy: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const AdminUpdateEventResponseSchema = z.object({
  event: AdminEventResponseSchema,
  dates: z.array(AdminEventDateResponseSchema),
  deletedDateIds: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
});
