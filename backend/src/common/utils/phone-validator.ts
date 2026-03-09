/**
 * Argentina mobile phone number validation (landline not accepted).
 *
 * Only the international format is accepted: +54 9 + area + local (9 is mobile prefix).
 * Normalized form (digits only): 549 + 10-digit national (e.g. +54 9 11 1234-5678 → 5491112345678).
 */

/** Digits-only regex: international mobile only (549 + 10-digit national). */
const ARGENTINA_MOBILE_REGEX = /^549\d{10}$/;

/**
 * Normalize input to digits only (strip spaces, dashes, +, etc.).
 */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Validate Argentina mobile phone number (landline is rejected).
 * Only accepts international format: +54 9 … (e.g. +54 9 11 1234-5678).
 *
 * @param phone - Raw input (with or without spaces/dashes/prefixes)
 * @returns true if the normalized number is a valid Argentina mobile (+549…)
 */
export function isValidArgentinaPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 0) return false;
  return ARGENTINA_MOBILE_REGEX.test(digits);
}
