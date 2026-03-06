/**
 * Heuristic name validation. Does NOT block registration or profile updates.
 * Used only to flag risk (e.g. raise risk level for step-up verification).
 */
const GARBAGE_WORDS = new Set([
  'test',
  'asdf',
  'aaaa',
  'qwerty',
  'user',
  'demo',
  'fake',
  'xxx',
  'abc',
  'sample',
  'temp',
  'temporal',
]);

const MIN_MEANINGFUL_LENGTH = 2;
const MAX_SYMBOL_RATIO = 0.3;
const MIN_ALPHA_RATIO = 0.5;

export interface NameValidationResult {
  /** True if the name looks suspicious (should raise risk, not block). */
  isSuspicious: boolean;
  /** Short reason for logging/analytics. */
  reason?: string;
}

/**
 * Validates a single name part (firstName or lastName).
 * Returns isSuspicious: true if the name looks like test/garbage data.
 */
export function validateNamePart(name: string): NameValidationResult {
  if (!name || typeof name !== 'string') {
    return { isSuspicious: false };
  }

  const trimmed = name.trim();
  if (trimmed.length < MIN_MEANINGFUL_LENGTH) {
    return { isSuspicious: true, reason: 'too_short' };
  }

  const lower = trimmed.toLowerCase();
  if (GARBAGE_WORDS.has(lower)) {
    return { isSuspicious: true, reason: 'garbage_word' };
  }

  const alphaCount = (trimmed.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
  const digitCount = (trimmed.match(/\d/g) || []).length;
  const symbolCount = trimmed.length - alphaCount - digitCount;
  const alphaRatio = alphaCount / trimmed.length;
  const symbolRatio = symbolCount / trimmed.length;

  if (alphaRatio < MIN_ALPHA_RATIO) {
    return { isSuspicious: true, reason: 'mostly_numeric_or_symbols' };
  }
  if (symbolRatio > MAX_SYMBOL_RATIO) {
    return { isSuspicious: true, reason: 'too_many_symbols' };
  }
  if (digitCount >= trimmed.length - 1) {
    return { isSuspicious: true, reason: 'mostly_numeric' };
  }

  return { isSuspicious: false };
}

/**
 * Validates full name (firstName + lastName). Convenience for registration/profile.
 */
export function validateFullName(
  firstName: string,
  lastName: string,
): NameValidationResult {
  const first = validateNamePart(firstName);
  if (first.isSuspicious) return first;
  return validateNamePart(lastName);
}
