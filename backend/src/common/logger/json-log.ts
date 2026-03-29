export function isJsonMode(): boolean {
  return process.env.LOG_FORMAT === 'json';
}

export function writeJsonLog(
  level: string,
  logger: string,
  message: unknown,
  extra?: Record<string, unknown>,
): void {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    app: 'nest',
    level,
    logger,
    message: typeof message === 'object' ? message : String(message),
    ...extra,
  };
  process.stdout.write(JSON.stringify(entry) + '\n');
}
