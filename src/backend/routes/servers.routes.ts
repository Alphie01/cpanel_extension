/* Server routes. Middleware order per route: (tenantContext + requestDeps applied
 * once at the router root) → requirePermission → validate → controller (resolved
 * per request from req.appDeps). */
import { Router } from 'express';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { reqHandler } from '../utils/request-handler';
import { idParamSchema } from '../validators/common.validators';
import {
  createServerSchema,
  listServersQuerySchema,
  updateServerSchema,
} from '../validators/server.validators';

export function serversRoutes(): Router {
  const router = Router();

  router.get(
    '/servers',
    requirePermission(PERMISSIONS.servers.view),
    validate({ query: listServersQuerySchema }),
    reqHandler((d) => d.serversController.list),
  );
  router.post(
    '/servers',
    requirePermission(PERMISSIONS.servers.create),
    validate({ body: createServerSchema }),
    reqHandler((d) => d.serversController.create),
  );
  router.get(
    '/servers/:id',
    requirePermission(PERMISSIONS.servers.view),
    validate({ params: idParamSchema }),
    reqHandler((d) => d.serversController.getById),
  );
  router.patch(
    '/servers/:id',
    requirePermission(PERMISSIONS.servers.edit),
    validate({ params: idParamSchema, body: updateServerSchema }),
    reqHandler((d) => d.serversController.update),
  );
  router.delete(
    '/servers/:id',
    requirePermission(PERMISSIONS.servers.delete),
    validate({ params: idParamSchema }),
    reqHandler((d) => d.serversController.remove),
  );
  router.post(
    '/servers/:id/test-connection',
    requirePermission(PERMISSIONS.servers.testConnection),
    validate({ params: idParamSchema }),
    reqHandler((d) => d.serversController.testConnection),
  );

  return router;
}
