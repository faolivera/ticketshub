/**
 * Resolves effective log level for a given context (logger name).
 * Set once at bootstrap from config; used by ConfigurableLogger and ContextLogger.
 * Levels are cascading: e.g. "log" enables log, warn, error, fatal.
 */
const LOG_LEVEL_SEVERITY: Record<string, number> = {
  verbose: 0,
  debug: 1,
  log: 2,
  info: 2, // same as log (NestJS uses "log", config may use "info")
  warn: 3,
  error: 4,
  fatal: 5,
};

export type LoggingConfig = {
  level: string;
  levels?: Record<string, string>;
};

let currentConfig: LoggingConfig | undefined;

export function setLogLevelConfig(config: LoggingConfig | undefined): void {
  currentConfig = config;
}

/**
 * Returns true if the given level is enabled for the given context (logger name).
 * Uses per-context override from config.logging.levels[name], or falls back to config.logging.level.
 * If config was never set, returns true (no filtering).
 */
export function isLogLevelEnabled(context: string, level: string): boolean {
  if (!currentConfig?.level) {
    return true;
  }
  const effectiveLevel = currentConfig.levels?.[context] ?? currentConfig.level;
  const levelSeverity = LOG_LEVEL_SEVERITY[level] ?? -1;
  const minSeverity = LOG_LEVEL_SEVERITY[effectiveLevel] ?? 0;
  return levelSeverity >= minSeverity;
}
