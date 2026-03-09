/**
 * Argentina mobile phone number validation (landline not accepted).
 *
 * Based on ENACOM numbering:
 * - International mobile: +54 9 + area + local (9 is mobile prefix, 15 omitted)
 * - National mobile: 15 + area + local (15 is mobile prefix)
 *
 * Accepted normalized forms (digits only):
 * - 13 digits: 549 + 10-digit national (e.g. +54 9 11 1234-5678 → 5491112345678)
 * - 11 digits: 15 + 10-digit national (e.g. 15 11 1234-5678 → 151112345678)
 */

/** Digits-only regex: mobile only (international 549… or national 15…). */
const ARGENTINA_MOBILE_REGEX = /^(?:549\d{10}|15\d{10})$/;

/**
 * Normalize input to digits only (strip spaces, dashes, +, etc.).
 */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Validate Argentina mobile phone number (landline is rejected).
 * Accepts: +54 9 11 1234-5678, 15 11 1234-5678, etc.
 *
 * @param phone - Raw input (with or without spaces/dashes/prefixes)
 * @returns true if the normalized number is a valid Argentina mobile
 */
export function isValidArgentinaPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 0) return false;
  return ARGENTINA_MOBILE_REGEX.test(digits);
}
