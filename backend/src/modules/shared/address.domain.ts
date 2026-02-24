/**
 * Geographic point with latitude and longitude
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Address structure used throughout the application
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
 * Address with geographic point (extended for users)
 */
export interface AddressWithGeoPoint extends Address {
  geoPoint?: GeoPoint;
}
