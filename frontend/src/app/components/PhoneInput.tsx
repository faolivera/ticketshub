import { useState } from 'react';
import { Globe } from 'lucide-react';
import { V, MUTED, BG, CARD, BORDER, BORD2, DARK, S, R_INPUT } from '@/lib/design-tokens';
import { COUNTRY_CODES } from '@/lib/country-calling-codes';

export const PHONE_DEFAULT = '+549';

/** Returns the flag emoji for the dialed prefix, or null if not yet identifiable. */
function detectFlag(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  for (const len of [4, 3, 2, 1] as const) {
    if (digits.length < len) continue;
    const match = COUNTRY_CODES.find(c => c.code === digits.slice(0, len));
    if (match) return match.flag;
  }
  return null;
}

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PhoneInput({ value, onChange, disabled, placeholder = '+549XXXXXXXXXX' }: PhoneInputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = focused ? V : BORD2;
  const detectedFlag = detectFlag(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    onChange('+' + digits);
  };

  return (
    <div style={{
      display: 'flex',
      borderRadius: R_INPUT,
      border: `1.5px solid ${borderColor}`,
      boxShadow: focused ? '0 0 0 3px rgba(105,45,212,0.1)' : 'none',
      transition: 'border-color 0.14s, box-shadow 0.14s',
      background: CARD,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 12px',
        borderRight: `1.5px solid ${borderColor}`,
        background: BG,
        flexShrink: 0,
        fontSize: 20, lineHeight: 1,
        transition: 'border-color 0.14s',
        userSelect: 'none',
      }}>
        {detectedFlag ? <span>{detectedFlag}</span> : <Globe size={20} color={MUTED} />}
      </div>
      <input
        type="tel"
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          flex: 1, minWidth: 0,
          padding: '12px 14px',
          border: 'none', outline: 'none',
          background: 'transparent',
          fontSize: 14, color: DARK,
          ...S,
        }}
      />
    </div>
  );
}

/** Returns true if the value contains a plausible international phone number. */
export function isPhoneEntered(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value.replace(/[\s\-]/g, ''));
}
