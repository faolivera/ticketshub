declare global {
  interface Window {
    __CONFIG__?: { googleClientId?: string };
  }
}

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

/**
 * Google OAuth Web Client ID. Prefers window.__CONFIG__.googleClientId (injected by SSR from backend env),
 * then VITE_GOOGLE_CLIENT_ID. Returns '' when missing or empty so the UI can hide Google login and separator.
 */
export function getGoogleClientId(): string {
  const fromWindow =
    typeof window !== 'undefined' ? window.__CONFIG__?.googleClientId : undefined;
  const fromEnv = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_CLIENT_ID;
  const raw = (typeof fromWindow === 'string' ? fromWindow : fromEnv) ?? '';
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : '';
}
