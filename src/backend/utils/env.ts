/* Typed, validated environment loader. Fails fast at boot (never at request
 * time) if anything required is missing or malformed. Takes an explicit source
 * so tests can inject a fake environment. */
import { z } from 'zod';
import { ExtErrorCode } from '../../shared/constants/error-codes';
import { ExtensionError } from './errors';

export type TenantContextMode = 'authenticated' | 'header';

export interface EnvConfig {
  databaseUrl: string;
  encryptionKey: Buffer;
  encryptionKeyId: string;
  tenantContextMode: TenantContextMode;
  platformJwtSecret: string | null;
  whmTimeoutMs: number;
  whmVerifySsl: boolean;
  port: number;
}

const rawSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  EXT_HOSTING_ENCRYPTION_KEY: z.string().min(1, 'EXT_HOSTING_ENCRYPTION_KEY is required'),
  EXT_HOSTING_TENANT_CONTEXT_MODE: z.enum(['authenticated', 'header']).default('authenticated'),
  EXT_PLATFORM_JWT_SECRET: z.string().optional(),
  EXT_HOSTING_WHM_TIMEOUT_MS: z.string().optional(),
  EXT_HOSTING_WHM_VERIFY_SSL: z.string().optional(),
  PORT: z.string().optional(),
});

const REQUIRED_KEY_BYTES = 32;

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true' || value === '1';
}

function parseIntOr(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/* Boot configuration for the out-of-process container. Unlike loadEnv(), this
 * does NOT require per-tenant secrets (DSN / encryption key) — those arrive per
 * request via x-ext-env-* headers — so the container can boot and serve /health
 * with no secrets configured. */
export interface BootConfig {
  port: number;
  tenantContextMode: TenantContextMode;
  platformJwtSecret: string | null;
  whmTimeoutMs: number;
  whmVerifySsl: boolean;
}

export function loadBootEnv(source: NodeJS.ProcessEnv = process.env): BootConfig {
  // Boot-resilient: never throws on missing secrets. Header-mode requests fail
  // clearly per request if EXT_PLATFORM_JWT_SECRET is absent.
  const mode: TenantContextMode =
    source.EXT_HOSTING_TENANT_CONTEXT_MODE === 'header' ? 'header' : 'authenticated';
  const platformJwtSecret = source.EXT_PLATFORM_JWT_SECRET ?? null;
  return {
    port: parseIntOr(source.PORT, 8080),
    tenantContextMode: mode,
    platformJwtSecret,
    whmTimeoutMs: parseIntOr(source.EXT_HOSTING_WHM_TIMEOUT_MS, 15000),
    whmVerifySsl: parseBool(source.EXT_HOSTING_WHM_VERIFY_SSL, true),
  };
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): EnvConfig {
  const parsed = rawSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  const env = parsed.data;

  const key = Buffer.from(env.EXT_HOSTING_ENCRYPTION_KEY, 'base64');
  if (key.length !== REQUIRED_KEY_BYTES) {
    throw new ExtensionError(
      ExtErrorCode.ENCRYPTION_KEY_INVALID,
      `EXT_HOSTING_ENCRYPTION_KEY must be base64 that decodes to ${REQUIRED_KEY_BYTES} bytes (got ${key.length}).`,
      500,
    );
  }

  const mode = env.EXT_HOSTING_TENANT_CONTEXT_MODE;
  const platformJwtSecret = env.EXT_PLATFORM_JWT_SECRET ?? null;
  if (mode === 'header' && !platformJwtSecret) {
    throw new Error('EXT_PLATFORM_JWT_SECRET is required when EXT_HOSTING_TENANT_CONTEXT_MODE=header.');
  }

  return {
    databaseUrl: env.DATABASE_URL,
    encryptionKey: key,
    encryptionKeyId: 'default',
    tenantContextMode: mode,
    platformJwtSecret,
    whmTimeoutMs: parseIntOr(env.EXT_HOSTING_WHM_TIMEOUT_MS, 15000),
    whmVerifySsl: parseBool(env.EXT_HOSTING_WHM_VERIFY_SSL, true),
    port: parseIntOr(env.PORT, 8080),
  };
}
