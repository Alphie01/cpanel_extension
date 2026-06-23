/* Parses raw WHM `listaccts`/`accountsummary` account records into the fields we
 * persist and the metrics we surface. WHM returns mixed types (numbers, numeric
 * strings, "unlimited", 0/1 flags), so every accessor is defensive. */

export interface ParsedWhmAccount {
  cpanelUser: string;
  domain: string | null;
  plan: string | null;
  suspended: boolean;
  raw: Record<string, unknown>;
}

function str(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number') return String(value);
  return null;
}

export function parseBoolish(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return /^(1|true|yes|on)$/i.test(value.trim());
  return false;
}

/** Parse a WHM size value (MB) into megabytes. Handles "unlimited", numbers,
 *  and numeric strings with optional K/M/G/T suffixes. */
export function parseMb(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '' || /unlimited/i.test(trimmed)) return null;
  const match = /^([\d.]+)\s*([KMGT]?)/i.exec(trimmed);
  if (!match) return null;
  const amount = Number.parseFloat(match[1]!);
  if (!Number.isFinite(amount)) return null;
  const unit = (match[2] ?? '').toUpperCase();
  const factor: Record<string, number> = { '': 1, K: 1 / 1024, M: 1, G: 1024, T: 1024 * 1024 };
  return Math.round(amount * (factor[unit] ?? 1));
}

export function parseWhmAccount(raw: Record<string, unknown>): ParsedWhmAccount {
  const user = str(raw.user) ?? str(raw.username);
  return {
    cpanelUser: user ?? 'unknown',
    domain: str(raw.domain),
    plan: str(raw.plan),
    suspended: parseBoolish(raw.suspended),
    raw,
  };
}
