import { Injectable } from '@nestjs/common';
import type { Address } from '../shared/address.domain';

/**
 * City name mappings by country code.
 * Keys are lowercase normalized input, values are the canonical display name.
 */
const CITY_MAPPINGS: Record<string, Record<string, string>> = {
  AR: {
    caba: 'C.A.B.A.',
  },
};

@Injectable()
export class AddressService {
  /**
   * Normalize city name in an address based on country-specific mappings.
   * Trims and lowercases the city for lookup, then applies the canonical name if a mapping exists.
   */
  normalizeCity(address: Address): Address {
    const countryMappings = CITY_MAPPINGS[address.countryCode.toUpperCase()];
    if (!countryMappings) {
      return address;
    }

    const normalized = address.city.trim().toLowerCase();
    const canonical = countryMappings[normalized];

    if (!canonical) {
      return address;
    }

    return { ...address, city: canonical };
  }
}
