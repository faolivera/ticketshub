/**
 * Locale-aware date and time formatting for display.
 * Uses the current i18n language (es → es-AR, en → en-US) so dates appear
 * in the user's selected language (e.g. "31 de marzo de 2026, 22:00" in Spanish).
 */

import i18n from '../i18n/config';

function getDateLocale(): string {
  try {
    const lang = i18n?.language ?? (typeof document !== 'undefined' ? document.documentElement.lang : null) ?? 'es';
    return lang.startsWith('es') ? 'es-AR' : 'en-US';
  } catch {
    return 'en-US';
  }
}

export type DateInput = string | number | Date;

function toDate(value: DateInput): Date {
  const d = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
  return d;
}

/**
 * Format a date for display (date only). Uses current UI language.
 * @example "March 31, 2026" / "31 de marzo de 2026"
 */
export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(getDateLocale(), options);
}

/**
 * Format time for display. Uses current UI language (24h in es-AR, 12h in en-US by locale).
 */
export function formatTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: undefined }
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = getDateLocale();
  const opts = { ...options };
  if (opts.hour12 === undefined) opts.hour12 = locale.startsWith('en');
  return date.toLocaleTimeString(locale, opts);
}

/**
 * Format date and time in one string. Uses current UI language.
 * @example "March 31, 2026 at 10:00 PM" / "31 de marzo de 2026, 22:00"
 */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(getDateLocale(), {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

/**
 * Month + year only (e.g. "Member since March 2026").
 * @param abbreviated - If true, use short month ("Mar 2026" / "mar 2026").
 */
export function formatMonthYear(value: DateInput, abbreviated = false): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(getDateLocale(), {
    month: abbreviated ? 'short' : 'long',
    year: 'numeric',
  });
}

/**
 * Short date for tables/lists (e.g. "Mar 31, 2026").
 */
export function formatDateShort(value: DateInput): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(getDateLocale(), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Short date + time for compact contexts like filter chips.
 * @example "Mar 30 · 8:00 PM" / "30 mar · 20:00"
 */
export function formatDateTimeShort(value: DateInput): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = getDateLocale();
  const datePart = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const timePart = date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale.startsWith('en'),
  });
  return `${datePart} · ${timePart}`;
}

/**
 * Medium date + short time for admin tables.
 */
export function formatDateTimeMedium(value: DateInput): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(getDateLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
