/**
 * Google Analytics (gtag). Load only when backend environment is "prod".
 */
const GA_MEASUREMENT_ID = 'G-P6SQZDLQ7Q';

export type AppEnvironment = 'dev' | 'test' | 'staging' | 'prod';

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

export function initAnalytics(environment: AppEnvironment): void {
  if (environment !== 'prod') return;

  window.dataLayer = window.dataLayer ?? [];
  function gtag(...args: unknown[]): void {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);

  // Load gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);
}
