/* Account routes. Implemented: list, detail, refresh, metrics, server sync.
 * Still stubbed (real auth + permission + validation, then 501): FTP and
 * per-account deployment endpoints. */
import { Router } from 'express';
import { listAccountsQuerySchema } from '../../shared/schemas/account.schema';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { makeStubHandler } from '../controllers/stub.controllers';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { reqHandler } from '../utils/request-handler';
import { idParamSchema, serverIdParamSchema } from '../validators/common.validators';

export function accountsRoutes(): Router {
  const router = Router();
  const idParam = { params: idParamSchema };

  // ── Implemented ──────────────────────────────────────────────────────────
  router.get(
    '/accounts',
    requirePermission(PERMISSIONS.accounts.view),
    validate({ query: listAccountsQuerySchema }),
    reqHandler((d) => d.accountsController.list),
  );
  router.get(
    '/accounts/:id',
    requirePermission(PERMISSIONS.accounts.view),
    validate(idParam),
    reqHandler((d) => d.accountsController.getById),
  );
  router.post(
    '/accounts/:id/refresh',
    requirePermission(PERMISSIONS.accounts.view),
    validate(idParam),
    reqHandler((d) => d.accountsController.refresh),
  );
  router.get(
    '/accounts/:id/metrics',
    requirePermission(PERMISSIONS.metrics.view),
    validate(idParam),
    reqHandler((d) => d.accountsController.getMetrics),
  );
  router.post(
    '/servers/:serverId/sync',
    requirePermission(PERMISSIONS.accounts.view),
    validate({ params: serverIdParamSchema }),
    reqHandler((d) => d.accountsController.syncServer),
  );

  // ── Still stubbed (501 after auth + permission + validation) ─────────────
  // (email, domain, and database endpoints are implemented in their own routers)
  router.get(
    '/accounts/:id/ftp-accounts',
    requirePermission(PERMISSIONS.ftp.view),
    validate(idParam),
    asyncHandler(makeStubHandler('FTP account listing')),
  );
  router.post(
    '/accounts/:id/deployments',
    requirePermission(PERMISSIONS.deployments.run),
    validate(idParam),
    asyncHandler(makeStubHandler('SFTP deployment')),
  );
  router.get(
    '/accounts/:id/deployments',
    requirePermission(PERMISSIONS.deployments.view),
    validate(idParam),
    asyncHandler(makeStubHandler('Deployment history')),
  );

  return router;
}
