/* Domain routes (nested under an account): list domains (with SSL status) and
 * trigger AutoSSL. */
import { Router } from 'express';
import { PERMISSIONS } from '../../shared/constants/permissions';
import type { DomainsController } from '../controllers/domains.controller';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { idParamSchema } from '../validators/common.validators';

export function domainsRoutes(controller: DomainsController): Router {
  const router = Router();

  router.get(
    '/accounts/:id/domains',
    requirePermission(PERMISSIONS.domains.view),
    validate({ params: idParamSchema }),
    asyncHandler(controller.list),
  );
  router.post(
    '/accounts/:id/domains/autossl',
    requirePermission(PERMISSIONS.domains.manage),
    validate({ params: idParamSchema }),
    asyncHandler(controller.autoSsl),
  );

  return router;
}
