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

export const CurrencyCodeSchema = z.enum(['EUR', 'USD', 'GBP']);

export const UserAddressSchema = AddressSchema.extend({
  geoPoint: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
});

export const UserStatusSchema = z.enum(['Enabled', 'Disabled', 'Suspended']);

// Domain schemas
export const AuthenticatedUserPublicInfoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  publicName: z.string(),
  pic: ImageSchema,
  country: z.string(),
  currency: CurrencyCodeSchema,
  address: UserAddressSchema.optional(),
  status: UserStatusSchema,
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
});

// API response schemas
export const LoginResponseSchema = z.object({
  token: z.string(),
  user: AuthenticatedUserPublicInfoSchema,
  requiresEmailVerification: z.boolean().optional(),
});

export const GetMeResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  publicName: z.string(),
  pic: ImageSchema,
  address: AddressSchema.optional(),
});

export const UpdateProfileResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  publicName: z.string(),
  pic: ImageSchema,
});

export const UpdateBasicInfoResponseSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  publicName: z.string(),
  pic: ImageSchema,
  address: AddressSchema.optional(),
});
