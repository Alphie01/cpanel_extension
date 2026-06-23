/* Resolves tenant context via the configured provider and attaches it to the
 * request. Must run before any permission guard or controller. */
import type { Request, RequestHandler } from 'express';
import { Errors } from '../utils/errors';
import type { TenantContext, TenantContextProvider } from '../context/tenant-context.types';

export function tenantContext(provider: TenantContextProvider): RequestHandler {
  return (req, _res, next): void => {
    provider
      .resolve(req)
      .then((ctx) => {
        req.tenant = ctx;
        next();
      })
      .catch(next);
  };
}

/** Asserts and returns the resolved tenant context (controllers/services use this). */
export function getTenant(req: Request): TenantContext {
  if (!req.tenant) {
    throw Errors.tenantContextMissing();
  }
  return req.tenant;
}
