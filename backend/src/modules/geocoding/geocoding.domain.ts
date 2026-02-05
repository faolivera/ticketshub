export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  countryCode: string;
}

export interface GeocodingTokenPayload {
  normalizedAddress: Address;
  lat: number;
  lng: number;
}

