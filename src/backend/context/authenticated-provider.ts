/* In-process provider (default). Trusts an authenticated context the host
 * injects onto the request (req.auth / req.user) after its own auth middleware.
 * Never trusts a body/query tenantId. */
import type { Request } from 'express';
import { Errors } from '../utils/errors';
import { EXTENSION_SLUG, type TenantContext, type TenantContextProvider } from './tenant-context.types';

interface HostAuth {
  tenantId?: unknown;
  userId?: unknown;
  permissions?: unknown;
}

function readHostAuth(req: Request): HostAuth | null {
  const candidate = (req as unknown as { auth?: HostAuth; user?: HostAuth }).auth
    ?? (req as unknown as { auth?: HostAuth; user?: HostAuth }).user;
  return candidate ?? null;
}

export class AuthenticatedContextProvider implements TenantContextProvider {
  async resolve(req: Request): Promise<TenantContext> {
    const auth = readHostAuth(req);
    if (!auth || typeof auth.tenantId !== 'string' || auth.tenantId.length === 0) {
      throw Errors.tenantContextMissing('No authenticated tenant context on the request.');
    }
    return {
      tenantId: auth.tenantId,
      userId: typeof auth.userId === 'string' ? auth.userId : null,
      permissions: Array.isArray(auth.permissions)
        ? auth.permissions.filter((p): p is string => typeof p === 'string')
        : [],
      extensionSlug: EXTENSION_SLUG,
      requestId: req.requestId ?? 'unknown',
    };
  }
}
