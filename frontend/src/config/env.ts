/**
 * Base URL for the app (origin). Used for canonical URLs and OG tags.
 * In browser defaults to window.location.origin; set VITE_APP_URL in .env for build/SSR.
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  const env = (import.meta as { env?: Record<string, string> }).env;
  return env?.VITE_APP_URL ?? '';
}
