/* [STUB] Top-level deployment endpoints (detail + rollback). Real auth +
 * permission + validation; 501 NOT_IMPLEMENTED until the SFTP engine ships. */
import { Router } from 'express';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { makeStubHandler } from '../controllers/stub.controllers';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { idParamSchema } from '../validators/common.validators';

export function deploymentsRoutes(): Router {
  const router = Router();
  const idParam = { params: idParamSchema };

  router.get(
    '/deployments/:id',
    requirePermission(PERMISSIONS.deployments.view),
    validate(idParam),
    asyncHandler(makeStubHandler('Deployment detail')),
  );
  router.post(
    '/deployments/:id/rollback',
    requirePermission(PERMISSIONS.deployments.rollback),
    validate(idParam),
    asyncHandler(makeStubHandler('Deployment rollback')),
  );

  return router;
}
