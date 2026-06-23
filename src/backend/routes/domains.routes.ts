/* Domain routes (nested under an account): list domains (with SSL status) and
 * trigger AutoSSL. */
import { Router } from 'express';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { reqHandler } from '../utils/request-handler';
import { idParamSchema } from '../validators/common.validators';

export function domainsRoutes(): Router {
  const router = Router();

  router.get(
    '/accounts/:id/domains',
    requirePermission(PERMISSIONS.domains.view),
    validate({ params: idParamSchema }),
    reqHandler((d) => d.domainsController.list),
  );
  router.post(
    '/accounts/:id/domains/autossl',
    requirePermission(PERMISSIONS.domains.manage),
    validate({ params: idParamSchema }),
    reqHandler((d) => d.domainsController.autoSsl),
  );

  return router;
}
