import { loadHoconConfig } from './load-hocon';

/**
 * NestJS custom configuration factory.
 * Loads HOCON based on ENVIRONMENT (only env var read here).
 */
export default function configuration(): Record<string, unknown> {
  const config = loadHoconConfig();
  console.log('resend from HOCON:', config?.resend);
  return config;
}
