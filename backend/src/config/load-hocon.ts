import path from 'path';
import { config as loadDotenv } from 'dotenv';
import { parse } from 'hocon-config';

const VALID_ENVIRONMENTS = ['dev', 'test', 'staging', 'prod'] as const;
export type AppEnvironment = (typeof VALID_ENVIRONMENTS)[number];

/**
 * Load configuration from HOCON files.
 * Loads .env from project root (if present) so ${?VAR} in HOCON can be resolved.
 * Only ENVIRONMENT is read from process.env to choose which .conf file to load;
 * all other values come from the HOCON file (with env substitution).
 * After parsing, process.env is attached under the "env" key for payment gateways.
 */
export function loadHoconConfig(overrideEnv?: AppEnvironment): Record<string, unknown> {
  loadDotenv({ path: path.join(process.cwd(), '.env') });
  const env = (overrideEnv ?? process.env.ENVIRONMENT ?? 'dev') as AppEnvironment;
  if (!VALID_ENVIRONMENTS.includes(env)) {
    throw new Error(
      `Invalid ENVIRONMENT "${env}". Must be one of: ${VALID_ENVIRONMENTS.join(', ')}.`,
    );
  }

  const configDir = path.join(__dirname, '..', '..', 'config');
  const configPath = path.join(configDir, `${env}.conf`);

  const parsed = parse(configPath, {
    parseEnv: true,
    parseArgs: false,
  }) as Record<string, unknown>;

  parsed.env = { ...process.env };
  parsed.app = {
    ...(parsed.app as object),
    environment: env,
    isProduction: env === 'prod' || env === 'staging',
  };

  return parsed;
}
