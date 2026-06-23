/* Token routes. Secrets are write-only: create/rotate accept a `token`, no
 * endpoint ever returns it. */
import { Router } from 'express';
import { PERMISSIONS } from '../../shared/constants/permissions';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { reqHandler } from '../utils/request-handler';
import { idParamSchema, serverIdParamSchema } from '../validators/common.validators';
import { createTokenSchema, updateTokenSchema } from '../validators/token.validators';

export function tokensRoutes(): Router {
  const router = Router();

  router.get(
    '/servers/:serverId/tokens',
    requirePermission(PERMISSIONS.tokens.view),
    validate({ params: serverIdParamSchema }),
    reqHandler((d) => d.tokensController.listForServer),
  );
  router.post(
    '/servers/:serverId/tokens',
    requirePermission(PERMISSIONS.tokens.create),
    validate({ params: serverIdParamSchema, body: createTokenSchema }),
    reqHandler((d) => d.tokensController.create),
  );
  router.get(
    '/tokens/:id',
    requirePermission(PERMISSIONS.tokens.view),
    validate({ params: idParamSchema }),
    reqHandler((d) => d.tokensController.getById),
  );
  router.patch(
    '/tokens/:id',
    requirePermission(PERMISSIONS.tokens.edit),
    validate({ params: idParamSchema, body: updateTokenSchema }),
    reqHandler((d) => d.tokensController.update),
  );
  router.delete(
    '/tokens/:id',
    requirePermission(PERMISSIONS.tokens.delete),
    validate({ params: idParamSchema }),
    reqHandler((d) => d.tokensController.remove),
  );

  return router;
}
