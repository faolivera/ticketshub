import {
  normalizePhoneDigits,
  isValidInternationalPhone,
} from '../../../../src/common/utils/phone-validator';

describe('phone-validator', () => {
  describe('normalizePhoneDigits', () => {
    it('strips non-digits', () => {
      expect(normalizePhoneDigits('+54 11 1234-5678')).toBe('541112345678');
      expect(normalizePhoneDigits(' 11 1234 5678 ')).toBe('1112345678');
    });
  });

  describe('isValidInternationalPhone', () => {
    it('accepts valid Argentina mobile (+549)', () => {
      expect(isValidInternationalPhone('+5491112345678')).toBe(true);
      expect(isValidInternationalPhone('+54 9 11 1234-5678')).toBe(true);
    });

    it('accepts valid US number (+1)', () => {
      expect(isValidInternationalPhone('+12025550123')).toBe(true);
    });

    it('accepts valid UK number (+44)', () => {
      expect(isValidInternationalPhone('+447911123456')).toBe(true);
    });

    it('accepts valid Brazil number (+55)', () => {
      expect(isValidInternationalPhone('+5511987654321')).toBe(true);
    });

    it('accepts valid Uruguay number (+598)', () => {
      expect(isValidInternationalPhone('+59899123456')).toBe(true);
    });

    it('rejects numbers without + prefix', () => {
      expect(isValidInternationalPhone('5491112345678')).toBe(false);
      expect(isValidInternationalPhone('12025550123')).toBe(false);
    });

    it('rejects numbers with invalid country code (+0, +999)', () => {
      expect(isValidInternationalPhone('+01234567890')).toBe(false);
      expect(isValidInternationalPhone('+99912345678')).toBe(false);
    });

    it('rejects numbers that are too short (< 7 digits)', () => {
      expect(isValidInternationalPhone('+1234')).toBe(false);
      expect(isValidInternationalPhone('+54123')).toBe(false);
    });

    it('rejects numbers that are too long (> 15 digits)', () => {
      expect(isValidInternationalPhone('+12345678901234567')).toBe(false);
    });

    it('rejects empty or non-string', () => {
      expect(isValidInternationalPhone('')).toBe(false);
      expect(isValidInternationalPhone('   ')).toBe(false);
      expect(isValidInternationalPhone(null as unknown as string)).toBe(false);
    });
  });
});
