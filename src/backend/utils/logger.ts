/* Structured JSON logger. Always redacts before writing. Includes the standard
 * observability fields (tenantId, extensionSlug, requestId, operation, status,
 * durationMs) when provided. Never logs secrets/tokens/connection strings. */
import { redact } from './redact';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  tenantId?: string;
  userId?: string | null;
  extensionSlug?: string;
  requestId?: string;
  operation?: string;
  status?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(base: LogFields): Logger;
}

const EXTENSION_SLUG = 'cpanel-whm-manager';

function emit(level: LogLevel, message: string, base: LogFields, fields?: LogFields): void {
  const record = {
    level,
    extensionSlug: EXTENSION_SLUG,
    message,
    ...redact({ ...base, ...fields }),
  };
  const line = JSON.stringify(record);
  // Single structured sink; eslint no-console is disabled only here.
  /* eslint-disable-next-line no-console */
  (level === 'error' ? console.error : console.log)(line);
}

export function createLogger(base: LogFields = {}): Logger {
  return {
    debug: (m, f) => emit('debug', m, base, f),
    info: (m, f) => emit('info', m, base, f),
    warn: (m, f) => emit('warn', m, base, f),
    error: (m, f) => emit('error', m, base, f),
    child: (extra) => createLogger({ ...base, ...extra }),
  };
}

export const logger = createLogger();
