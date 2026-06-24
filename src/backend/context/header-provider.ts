/* Gateway/header provider (out-of-process). Reads tenant context from the headers
 * the platform gateway injects:
 *   x-tenant-id, x-user-id, x-ext-slug, x-ext-permissions, and optionally
 *   x-ext-token (a signed context token).
 *
 * Two trust modes, chosen automatically per request:
 *
 *  1. SIGNED (strict): if x-ext-token is present AND a JWT secret is available
 *     (EXT_PLATFORM_JWT_SECRET boot env, or per-tenant header
 *     x-ext-env-ext_platform_jwt_secret), the token is verified —
 *       x-ext-token = base64url(payload).base64url(HMAC_SHA256(base64url(payload)))
 *       payload = { t: tenantId, u: userId, s: slug, exp: epochSeconds }
 *     with a short TTL and tenant/slug binding.
 *
 *  2. NETWORK-TRUST (default when no token/secret): the container is not publicly
 *     reachable — only the platform gateway can call it — so the gateway-injected
 *     x-tenant-id is trusted directly without HMAC. To require signatures, provide
 *     the secret (+ x-ext-token). */
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
  // The boot secret may be empty; it can also arrive per request (per-tenant).
  constructor(private readonly jwtSecret: string) {}

  async resolve(req: Request): Promise<TenantContext> {
    const tenantId = header(req, 'x-tenant-id');
    if (!tenantId) {
      throw Errors.unauthenticated('Missing x-tenant-id header.');
    }
    const slug = header(req, 'x-ext-slug');
    const rawToken = header(req, 'x-ext-token');
    const secret = this.jwtSecret || header(req, 'x-ext-env-ext_platform_jwt_secret') || '';

    if (rawToken && secret) {
      const payload = this.verifyToken(rawToken, secret);
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

    // Network-trust: no signed token (or no secret to verify it). Trust the
    // gateway-injected x-tenant-id — the container is reachable only via the
    // gateway. Enable signatures by supplying the secret + x-ext-token.
    return {
      tenantId,
      userId: header(req, 'x-user-id'),
      permissions: this.readPermissions(req),
      extensionSlug: EXTENSION_SLUG,
      requestId: req.requestId ?? 'unknown',
    };
  }

  private verifyToken(raw: string, secret: string): TokenPayload {
    const parts = raw.split('.');
    if (parts.length !== 2) {
      throw Errors.unauthenticated('Malformed tenant context token.');
    }
    const [payloadB64, signatureB64] = parts as [string, string];
    const expected = createHmac('sha256', secret).update(payloadB64).digest('base64url');
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
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const arr = JSON.parse(trimmed) as unknown;
        if (Array.isArray(arr)) return arr.filter((p): p is string => typeof p === 'string');
      } catch {
        // fall through to comma-splitting
      }
    }
    return trimmed
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
}
