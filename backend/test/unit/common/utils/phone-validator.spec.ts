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

  describe('isValidArgentinaPhone (mobile only)', () => {
    it('accepts international mobile (549 + 10-digit national)', () => {
      expect(isValidArgentinaPhone('5491112345678')).toBe(true);
      expect(isValidArgentinaPhone('+54 9 11 1234-5678')).toBe(true);
      expect(isValidArgentinaPhone('+5492617482639')).toBe(true); // Mendoza
    });

    it('accepts national mobile with 15 prefix (15 + 10-digit national)', () => {
      expect(isValidArgentinaPhone('151112345678')).toBe(true);
      expect(isValidArgentinaPhone('15 11 1234-5678')).toBe(true);
      expect(isValidArgentinaPhone('152611234567')).toBe(true);
    });

    it('rejects landline (10 digits without 15 or 549)', () => {
      expect(isValidArgentinaPhone('1112345678')).toBe(false);
      expect(isValidArgentinaPhone('11 1234-5678')).toBe(false);
      expect(isValidArgentinaPhone('2231234567')).toBe(false);
      expect(isValidArgentinaPhone('3511234567')).toBe(false);
    });

    it('rejects too short or invalid', () => {
      expect(isValidArgentinaPhone('111234567')).toBe(false);
      expect(isValidArgentinaPhone('549111234567')).toBe(false); // 549 + 9 digits
    });

    it('rejects empty or non-string', () => {
      expect(isValidArgentinaPhone('')).toBe(false);
      expect(isValidArgentinaPhone('   ')).toBe(false);
      expect(isValidArgentinaPhone(null as unknown as string)).toBe(false);
    });
  });
});
