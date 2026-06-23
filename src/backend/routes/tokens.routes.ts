/* Token routes. Secrets are write-only: create/rotate accept a `token`, no
 * endpoint ever returns it. */
import { Router } from 'express';
import { PERMISSIONS } from '../../shared/constants/permissions';
import type { TokensController } from '../controllers/tokens.controller';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { idParamSchema, serverIdParamSchema } from '../validators/common.validators';
import { createTokenSchema, updateTokenSchema } from '../validators/token.validators';

export function tokensRoutes(controller: TokensController): Router {
  const router = Router();

  router.get(
    '/servers/:serverId/tokens',
    requirePermission(PERMISSIONS.tokens.view),
    validate({ params: serverIdParamSchema }),
    asyncHandler(controller.listForServer),
  );
  router.post(
    '/servers/:serverId/tokens',
    requirePermission(PERMISSIONS.tokens.create),
    validate({ params: serverIdParamSchema, body: createTokenSchema }),
    asyncHandler(controller.create),
  );
  router.get(
    '/tokens/:id',
    requirePermission(PERMISSIONS.tokens.view),
    validate({ params: idParamSchema }),
    asyncHandler(controller.getById),
  );
  router.patch(
    '/tokens/:id',
    requirePermission(PERMISSIONS.tokens.edit),
    validate({ params: idParamSchema, body: updateTokenSchema }),
    asyncHandler(controller.update),
  );
  router.delete(
    '/tokens/:id',
    requirePermission(PERMISSIONS.tokens.delete),
    validate({ params: idParamSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
