type Redactable = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

function redactString(s: string): string {
  if (s.length <= 4) return s;
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

export function redact(value: Redactable): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item as Redactable));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => [k, redact(v as Redactable)]),
    );
  }
  return value;
}
