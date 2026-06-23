/* Email account routes (nested under an account): list, create, update
 * (password/quota/suspend), delete. */
import { Router } from 'express';
import { PERMISSIONS } from '../../shared/constants/permissions';
import {
  createEmailSchema,
  emailParamSchema,
  updateEmailSchema,
} from '../../shared/schemas/email.schema';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { reqHandler } from '../utils/request-handler';
import { idParamSchema } from '../validators/common.validators';

export function emailRoutes(): Router {
  const router = Router();

  router.get(
    '/accounts/:id/email-accounts',
    requirePermission(PERMISSIONS.email.view),
    validate({ params: idParamSchema }),
    reqHandler((d) => d.emailController.list),
  );
  router.post(
    '/accounts/:id/email-accounts',
    requirePermission(PERMISSIONS.email.manage),
    validate({ params: idParamSchema, body: createEmailSchema }),
    reqHandler((d) => d.emailController.create),
  );
  router.patch(
    '/accounts/:id/email-accounts/:emailId',
    requirePermission(PERMISSIONS.email.manage),
    validate({ params: emailParamSchema, body: updateEmailSchema }),
    reqHandler((d) => d.emailController.update),
  );
  router.delete(
    '/accounts/:id/email-accounts/:emailId',
    requirePermission(PERMISSIONS.email.manage),
    validate({ params: emailParamSchema }),
    reqHandler((d) => d.emailController.remove),
  );

  return router;
}
