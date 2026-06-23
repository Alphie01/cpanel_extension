/* Gateway/header provider (echo contract). Reads tenant context from the headers
 * the platform gateway injects and VERIFIES the x-ext-token HMAC before trusting
 * any of it:
 *   x-ext-token = base64url(payload).base64url(HMAC_SHA256(base64url(payload)))
 *   payload     = { t: tenantId, u: userId, s: slug, exp: epochSeconds }
 * Signed with EXT_PLATFORM_JWT_SECRET, short TTL. Permissions arrive via the
 * x-ext-permissions header (a documented host seam). */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { Errors } from '../utils/errors';
import { EXTENSION_SLUG, type TenantContext, type TenantContextProvider } from './tenant-context.types';

const MAX_TTL_SECONDS = 600;

interface TokenPayload {
  t: string;
  u?: string;
  s: string;
  exp: number;
}

function base64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function header(req: Request, name: string): string | null {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' ? value : null;
}

export class HeaderContextProvider implements TenantContextProvider {
  // The secret may be empty at boot (container starts before it is configured);
  // we fail clearly per request rather than crash-looping the container.
  constructor(private readonly jwtSecret: string) {}

  async resolve(req: Request): Promise<TenantContext> {
    if (!this.jwtSecret) {
      throw Errors.unauthenticated('Platform JWT secret is not configured for this extension.');
    }
    const tenantId = header(req, 'x-tenant-id');
    const slug = header(req, 'x-ext-slug');
    const rawToken = header(req, 'x-ext-token');
    if (!tenantId || !rawToken) {
      throw Errors.unauthenticated('Missing tenant context headers.');
    }

    const payload = this.verifyToken(rawToken);

    if (payload.t !== tenantId) {
      throw Errors.unauthenticated('Tenant id does not match signed token.');
    }
    if (slug && payload.s !== slug) {
      throw Errors.unauthenticated('Extension slug does not match signed token.');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(payload.exp) || payload.exp < nowSeconds) {
      throw Errors.unauthenticated('Tenant context token has expired.');
    }
    if (payload.exp - nowSeconds > MAX_TTL_SECONDS) {
      throw Errors.unauthenticated('Tenant context token TTL is out of bounds.');
    }

    return {
      tenantId,
      userId: payload.u ?? header(req, 'x-user-id'),
      permissions: this.readPermissions(req),
      extensionSlug: EXTENSION_SLUG,
      requestId: req.requestId ?? 'unknown',
    };
  }

  private verifyToken(raw: string): TokenPayload {
    const parts = raw.split('.');
    if (parts.length !== 2) {
      throw Errors.unauthenticated('Malformed tenant context token.');
    }
    const [payloadB64, signatureB64] = parts as [string, string];
    const expected = createHmac('sha256', this.jwtSecret).update(payloadB64).digest('base64url');
    const expectedBuf = Buffer.from(expected);
    const providedBuf = Buffer.from(signatureB64);
    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      throw Errors.unauthenticated('Invalid tenant context token signature.');
    }
    try {
      return JSON.parse(base64urlDecode(payloadB64)) as TokenPayload;
    } catch {
      throw Errors.unauthenticated('Unreadable tenant context token payload.');
    }
  }

  private readPermissions(req: Request): string[] {
    const raw = header(req, 'x-ext-permissions');
    if (!raw) return [];
    return raw
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
}
