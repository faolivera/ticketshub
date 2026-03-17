import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from './utils';

/**
 * Returns locale for number formatting: Spanish uses "." for thousands,
 * English uses "," for thousands.
 */
function getNumberLocale(lang: string): string {
  return lang.startsWith('es') ? 'es-AR' : 'en-US';
}

/**
 * Format an integer for display with thousand separators only (no decimals).
 * es-AR → "1.234", en-US → "1,234".
 */
function formatIntegerWithThousands(value: number, lang: string): string {
  if (Number.isNaN(value) || value < 0) return '0';
  const locale = getNumberLocale(lang);
  return Math.floor(value).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Strip all non-digit characters and parse to number.
 */
function parseDigitsToNumber(input: string): number {
  const digits = input.replace(/\D/g, '');
  return digits === '' ? 0 : parseInt(digits, 10);
}

export interface CurrencyAmountInputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  value: number;
  onChange: (value: number) => void;
  currency: string;
  min?: number;
  max?: number;
}

/**
 * Input for currency amounts: only digits allowed, no symbols or decimal separators.
 * Displays value with thousand separators based on locale (e.g. "1.234" for es, "1,234" for en).
 * Shows currency code/symbol as prefix.
 */
const CurrencyAmountInputComponent = (
  props: CurrencyAmountInputProps,
  ref: React.Ref<HTMLInputElement>
) => {
    const { value, onChange, currency, min = 0, max, className, id, 'aria-invalid': ariaInvalid, ...rest } = props;
    const { i18n } = useTranslation();
    const lang = i18n.language ?? 'es';
    const [isFocused, setIsFocused] = React.useState(false);
    const [localValue, setLocalValue] = React.useState('');

    const displayValue =
      isFocused && localValue !== ''
        ? formatIntegerWithThousands(parseDigitsToNumber(localValue), lang)
        : isFocused
          ? localValue
          : formatIntegerWithThousands(value, lang);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      setLocalValue(value > 0 ? String(Math.floor(value)) : '');
      rest.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const num = parseDigitsToNumber(localValue);
      const clamped = max != null ? Math.min(Math.max(num, min), max) : Math.max(num, min);
      onChange(clamped);
      setLocalValue('');
      setIsFocused(false);
      rest.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const num = parseDigitsToNumber(raw);
      setLocalValue(raw.replace(/\D/g, ''));
      const clamped = max != null ? Math.min(Math.max(num, min), max) : Math.max(num, min);
      onChange(clamped);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        !/[0-9]/.test(e.key) &&
        e.key !== 'Backspace' &&
        e.key !== 'Delete' &&
        e.key !== 'Tab' &&
        e.key !== 'ArrowLeft' &&
        e.key !== 'ArrowRight' &&
        e.key !== 'Home' &&
        e.key !== 'End' &&
        !(e.ctrlKey || e.metaKey) &&
        e.key !== 'a' // allow Ctrl+A
      ) {
        e.preventDefault();
      }
      rest.onKeyDown?.(e);
    };

    return (
      <div
        className={cn(
          'flex rounded-lg border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring',
          className
        )}
      >
        <span className="flex items-center pl-4 pr-2 text-muted-foreground font-medium border-r bg-muted/50 min-w-[3rem]">
          {currency === 'ARS' ? '$' : currency}
        </span>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          data-currency={currency}
          id={id}
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-invalid={ariaInvalid}
          className={cn(
            'border-0 rounded-none focus-visible:ring-0 min-h-[44px] text-base flex-1 w-full min-w-0',
            'bg-transparent px-3 py-2 outline-none'
          )}
          {...rest}
        />
      </div>
    );
};

export const CurrencyAmountInput = React.forwardRef(CurrencyAmountInputComponent);
CurrencyAmountInput.displayName = 'CurrencyAmountInput';
