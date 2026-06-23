/* Tenant context — the authenticated identity every request is scoped to.
 * Acquisition is pluggable (see authenticated-provider / header-provider) so the
 * extension works whether the host injects an authenticated context in-process
 * or proxies it as gateway headers. */
import type { Request } from 'express';
import type { RequestControllers } from '../request-controllers';

export const EXTENSION_SLUG = 'cpanel-whm-manager';

export interface TenantContext {
  tenantId: string;
  userId: string | null;
  permissions: string[];
  extensionSlug: string;
  requestId: string;
}

export interface ValidatedData {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

export interface TenantContextProvider {
  /** Resolve and validate context, or throw an ExtensionError (401). */
  resolve(req: Request): Promise<TenantContext>;
}

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: TenantContext;
    requestId?: string;
    validated?: ValidatedData;
    appDeps?: RequestControllers;
  }
}
