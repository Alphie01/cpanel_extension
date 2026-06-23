/* Secret scrubber. Recursively masks values whose key looks sensitive before
 * anything is logged or persisted to the audit table. Defense-in-depth: even if
 * a caller accidentally passes a token, it never reaches logs or the DB. */
const SENSITIVE_KEY_RE =
  /(token|secret|password|passphrase|authorization|api[-_]?key|private[-_]?key|tokenenc|secretenc)/i;

const MASK = '[REDACTED]';
const MAX_DEPTH = 8;

export function redact<T>(value: T, depth = 0): T {
  if (depth > MAX_DEPTH) return MASK as unknown as T;
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_RE.test(key) ? MASK : redact(val, depth + 1);
    }
    return out as unknown as T;
  }
  return value;
}

/** Mask a raw secret string, keeping only the last 4 chars for display hints. */
export function lastFour(secret: string): string {
  if (secret.length <= 4) return '••••';
  return secret.slice(-4);
}
