import {
  normalizePhoneDigits,
  isValidArgentinaPhone,
} from '../../../../src/common/utils/phone-validator';

describe('phone-validator (Argentina)', () => {
  describe('normalizePhoneDigits', () => {
    it('strips non-digits', () => {
      expect(normalizePhoneDigits('+54 11 1234-5678')).toBe('541112345678');
      expect(normalizePhoneDigits(' 11 1234 5678 ')).toBe('1112345678');
    });
  });

  describe('isValidArgentinaPhone', () => {
    it('accepts Buenos Aires 10-digit (11 + 8)', () => {
      expect(isValidArgentinaPhone('1112345678')).toBe(true);
      expect(isValidArgentinaPhone('11 1234-5678')).toBe(true);
      expect(isValidArgentinaPhone('(11) 1234-5678')).toBe(true);
    });

    it('accepts other area codes 10-digit', () => {
      expect(isValidArgentinaPhone('2231234567')).toBe(true); // Mar del Plata
      expect(isValidArgentinaPhone('3511234567')).toBe(true); // Córdoba
      expect(isValidArgentinaPhone('3831234567')).toBe(true);
      expect(isValidArgentinaPhone('2901123456')).toBe(true); // Ushuaia 4-digit area
    });

    it('accepts international mobile format (549 + 9 digits)', () => {
      expect(isValidArgentinaPhone('5491112345678')).toBe(true);
      expect(isValidArgentinaPhone('+54 9 11 1234-5678')).toBe(true);
      expect(isValidArgentinaPhone('0054 9 11 12345678')).toBe(true);
    });

    it('rejects too short', () => {
      expect(isValidArgentinaPhone('111234567')).toBe(false);
      expect(isValidArgentinaPhone('123')).toBe(false);
    });

    it('rejects invalid area', () => {
      expect(isValidArgentinaPhone('1012345678')).toBe(false); // 10 not valid as single area
      expect(isValidArgentinaPhone('5512345678')).toBe(false); // 55 not valid
    });

    it('rejects empty or non-string', () => {
      expect(isValidArgentinaPhone('')).toBe(false);
      expect(isValidArgentinaPhone('   ')).toBe(false);
      expect(isValidArgentinaPhone(null as unknown as string)).toBe(false);
    });
  });
});
