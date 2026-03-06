import { z } from 'zod';

// Shared schemas (can be imported by other modules)
export const ImageSchema = z.object({
  id: z.string(),
  src: z.string(),
});

export const AddressSchema = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  countryCode: z.string(),
});

export const CurrencyCodeSchema = z.enum(['EUR', 'USD', 'GBP', 'ARS']);

export const UserAddressSchema = AddressSchema.extend({
  geoPoint: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

export const UserStatusSchema = z.enum(['Enabled', 'Disabled', 'Suspended']);

// Domain schemas (full user with verification objects - internal only; not exposed in GET /me)
export const IdentityVerificationSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  legalFirstName: z.string(),
  legalLastName: z.string(),
  dateOfBirth: z.string(),
  governmentIdNumber: z.string(),
  submittedAt: z.coerce.date(),
  reviewedAt: z.coerce.date().optional(),
  reviewedBy: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export const BankAccountSchema = z.object({
  holderName: z.string(),
  cbuOrCvu: z.string(),
  alias: z.string().optional(),
  verified: z.boolean(),
  verifiedAt: z.coerce.date().optional(),
});

/** Public "me" / login user shape: only booleans for verification, no full identity/bank payloads */
const PublicMeUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: z.enum(['User', 'Admin']),
  publicName: z.string(),
  pic: ImageSchema.nullable(),
  phone: z.string().optional(),
  country: z.string(),
  currency: CurrencyCodeSchema,
  address: UserAddressSchema.optional(),
  status: UserStatusSchema,
  acceptedSellerTermsAt: z.date().nullable().optional(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  tosAcceptedAt: z.date().optional(),
  identityVerified: z.boolean(),
  bankDetailsVerified: z.boolean(),
  identityVerificationStatus: z.enum(['none', 'pending', 'approved', 'rejected']).optional(),
  bankAccountStatus: z.enum(['none', 'pending', 'approved']).optional(),
  buyerDisputed: z.boolean(),
  bankAccountLast4: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// API response schemas
export const LoginResponseSchema = z.object({
  token: z.string(),
  user: PublicMeUserSchema,
  requiresEmailVerification: z.boolean().optional(),
});

export const GetMeResponseSchema = PublicMeUserSchema;

export const UpdateProfileResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  publicName: z.string(),
  pic: ImageSchema.nullable(),
});

export const UpdateBasicInfoResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  publicName: z.string(),
  pic: ImageSchema.nullable(),
  address: AddressSchema.optional(),
});
