/**
 * Argentina phone number validation.
 *
 * Based on ENACOM numbering:
 * - Country code: +54
 * - National: 10 digits (area code 2–4 digits + local 6–8 digits)
 * - International mobile: +54 9 area local (9 is mobile prefix, 15 omitted)
 *
 * Accepted normalized forms (digits only):
 * - 10 digits: 11xxxxxxxx (Buenos Aires) or [2368]xxxxxxxxx (other areas)
 * - 11 digits: 549xxxxxxxxx (international mobile format)
 */

/** Digits-only regex for Argentina national (10) or international mobile (11 digits). */
const ARGENTINA_PHONE_REGEX =
  /^(?:549\d{9}|11\d{8}|[2368]\d{9})$/;

/**
 * Normalize input to digits only (strip spaces, dashes, +, etc.).
 */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Validate Argentina phone number.
 * Accepts formats like: +54 9 11 1234-5678, 11 1234-5678, 15 11 1234-5678, etc.
 *
 * @param phone - Raw input (with or without spaces/dashes/prefixes)
 * @returns true if the normalized number is a valid Argentina number
 */
export function isValidArgentinaPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 0) return false;
  return ARGENTINA_PHONE_REGEX.test(digits);
}
