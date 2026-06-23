/* Email account routes (nested under an account). Implemented this release:
 * list, create, update (password/quota/suspend), delete. */
import { Router } from 'express';
import { PERMISSIONS } from '../../shared/constants/permissions';
import {
  createEmailSchema,
  emailParamSchema,
  updateEmailSchema,
} from '../../shared/schemas/email.schema';
import type { EmailController } from '../controllers/email.controller';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { idParamSchema } from '../validators/common.validators';

export function emailRoutes(controller: EmailController): Router {
  const router = Router();

  router.get(
    '/accounts/:id/email-accounts',
    requirePermission(PERMISSIONS.email.view),
    validate({ params: idParamSchema }),
    asyncHandler(controller.list),
  );
  router.post(
    '/accounts/:id/email-accounts',
    requirePermission(PERMISSIONS.email.manage),
    validate({ params: idParamSchema, body: createEmailSchema }),
    asyncHandler(controller.create),
  );
  router.patch(
    '/accounts/:id/email-accounts/:emailId',
    requirePermission(PERMISSIONS.email.manage),
    validate({ params: emailParamSchema, body: updateEmailSchema }),
    asyncHandler(controller.update),
  );
  router.delete(
    '/accounts/:id/email-accounts/:emailId',
    requirePermission(PERMISSIONS.email.manage),
    validate({ params: emailParamSchema }),
    asyncHandler(controller.remove),
  );

  return router;
}
