/**
 * Format a money amount (in cents) for display.
 * ARS uses "$" as symbol; other currencies use Intl.NumberFormat.
 * Respects current UI language: Spanish uses "." for thousands and "," for decimal.
 */

import i18n from '../i18n/config';

export function formatCurrency(amountInCents: number, currency: string): string {
  const amount = amountInCents / 100;
  const locale = getNumberLocale();
  if (currency === 'ARS') {
    return '$' + amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a decimal amount (e.g. from price * quantity) for display with a given currency.
 * Use when you have the value in units (not cents).
 * Respects current UI language: Spanish uses "." for thousands and "," for decimal.
 */
export function formatCurrencyFromUnits(amount: number, currency: string): string {
  const locale = getNumberLocale();
  if (currency === 'ARS') {
    return '$' + amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Locale for number formatting: Spanish uses "." thousands and "," decimal.
 */
function getNumberLocale(): string {
  try {
    const lang = i18n?.language ?? (typeof document !== 'undefined' ? document.documentElement.lang : null) ?? 'es';
    return lang.startsWith('es') ? 'es-AR' : 'en-US';
  } catch {
    return 'en-US';
  }
}
