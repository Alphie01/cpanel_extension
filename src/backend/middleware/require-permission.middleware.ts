/* Permission guard. Passes if the tenant context holds the required permission
 * OR the hosting_control.admin superuser grant. Runs after tenantContext. */
import type { RequestHandler } from 'express';
import { ADMIN_PERMISSION } from '../../shared/constants/permissions';
import { Errors } from '../utils/errors';

export function requirePermission(permission: string): RequestHandler {
  return (req, _res, next): void => {
    const ctx = req.tenant;
    if (!ctx) {
      next(Errors.tenantContextMissing());
      return;
    }
    if (ctx.permissions.includes(permission) || ctx.permissions.includes(ADMIN_PERMISSION)) {
      next();
      return;
    }
    next(Errors.forbidden('Missing required permission.', { required: permission }));
  };
}
