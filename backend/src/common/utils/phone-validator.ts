/**
 * International phone number validation (E.164 format).
 *
 * Accepts any number starting with + followed by a known ITU-T country calling
 * code (1–3 digits) and a total digit count of 7–15 (E.164 standard).
 */

/** Known ITU-T E.164 country calling codes. */
const CALLING_CODES = new Set([
  // 1-digit
  '1', '7',
  // 2-digit
  '20', '27',
  '30', '31', '32', '33', '34', '36', '39',
  '40', '41', '43', '44', '45', '46', '47', '48', '49',
  '51', '52', '53', '54', '55', '56', '57', '58',
  '60', '61', '62', '63', '64', '65', '66',
  '81', '82', '84', '86',
  '90', '91', '92', '93', '94', '95', '98',
  // 3-digit
  '211', '212', '213', '216', '218',
  '220', '221', '222', '223', '224', '225', '226', '227', '228', '229',
  '230', '231', '232', '233', '234', '235', '236', '237', '238', '239',
  '240', '241', '242', '243', '244', '245', '246', '247', '248', '249',
  '250', '251', '252', '253', '254', '255', '256', '257', '258',
  '260', '261', '262', '263', '264', '265', '266', '267', '268', '269',
  '290', '291', '297', '298', '299',
  '350', '351', '352', '353', '354', '355', '356', '357', '358', '359',
  '370', '371', '372', '373', '374', '375', '376', '377', '378',
  '380', '381', '382', '383', '385', '386', '387', '389',
  '420', '421', '423',
  '500', '501', '502', '503', '504', '505', '506', '507', '508', '509',
  '590', '591', '592', '593', '594', '595', '596', '597', '598', '599',
  '670', '672', '673', '674', '675', '676', '677', '678', '679',
  '680', '681', '682', '683', '685', '686', '687', '688', '689', '690', '691', '692',
  '850', '852', '853', '855', '856',
  '880', '886',
  '960', '961', '962', '963', '964', '965', '966', '967', '968',
  '970', '971', '972', '973', '974', '975', '976', '977',
  '992', '993', '994', '995', '996', '998',
]);

/**
 * Normalize input to digits only (strip spaces, dashes, +, etc.).
 */
export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Validate an international phone number.
 * Accepts E.164 format: + followed by a known country calling code and 7–15 total digits.
 *
 * @param phone - Raw input (may include spaces, dashes, + prefix)
 * @returns true if the number has a valid country code and length
 */
export function isValidInternationalPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  if (!trimmed.startsWith('+')) return false;
  const digits = trimmed.slice(1).replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  for (const len of [1, 2, 3] as const) {
    if (CALLING_CODES.has(digits.slice(0, len))) return true;
  }
  return false;
}
