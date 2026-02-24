/**
 * Currency codes supported by the platform
 */
export type CurrencyCode = 'EUR' | 'USD' | 'GBP';

/**
 * Money representation (amount in cents)
 */
export interface Money {
  amount: number; // in cents
  currency: CurrencyCode;
}

/**
 * Geographic point with latitude and longitude
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Address structure
 */
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
}

/**
 * Address with geographic point
 */
export interface AddressWithGeoPoint extends Address {
  geoPoint?: GeoPoint;
}

/**
 * Image reference
 */
export interface Image {
  id: string;
  src: string;
}

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}
