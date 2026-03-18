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
 * Spanish: day/month/year (e.g. 31/03/2026). English: long month name.
 */
export function formatDate(
  value: DateInput,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = getDateLocale();
  const isEs = locale.startsWith('es');
  const defaults: Intl.DateTimeFormatOptions = isEs
    ? { day: '2-digit', month: '2-digit', year: 'numeric' }
    : { month: 'long', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString(locale, { ...defaults, ...options });
}

/**
 * Format time for display. Uses current UI language, always 24h.
 */
export function formatTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: false }
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = getDateLocale();
  const opts = { ...options, hour12: false };
  return date.toLocaleTimeString(locale, opts);
}

/**
 * Format date and time in one string. Uses current UI language, time in 24h.
 * Spanish: dd/mm/yyyy, HH:mm (e.g. 31/03/2026, 22:00).
 */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = getDateLocale();
  if (locale.startsWith('es')) {
    const d = date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const tm = date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${d}, ${tm}`;
  }
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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
 * Short date + time for compact contexts like filter chips. Time always 24h.
 * @example "Mar 30 · 20:00" / "30 mar · 20:00"
 */
export function formatDateTimeShort(value: DateInput): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = getDateLocale();
  const datePart = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const timePart = date.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} · ${timePart}`;
}

/**
 * Medium date + short time for admin tables. Time always 24h.
 */
export function formatDateTimeMedium(value: DateInput): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = getDateLocale();
  const datePart = date.toLocaleDateString(locale, { dateStyle: 'medium' });
  const timePart = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart}, ${timePart}`;
}
