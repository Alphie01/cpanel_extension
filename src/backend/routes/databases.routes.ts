/* Database routes (nested under an account): list, create database/user, assign
 * a user to a database, delete (database delete requires ?confirm=true). */
import { Router } from 'express';
import { PERMISSIONS } from '../../shared/constants/permissions';
import {
  assignDatabaseUserSchema,
  createDatabaseSchema,
  createDatabaseUserSchema,
  dbNameParamSchema,
  dbUserParamSchema,
} from '../../shared/schemas/database.schema';
import type { DatabasesController } from '../controllers/databases.controller';
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { idParamSchema } from '../validators/common.validators';

export function databasesRoutes(controller: DatabasesController): Router {
  const router = Router();

  router.get(
    '/accounts/:id/databases',
    requirePermission(PERMISSIONS.databases.view),
    validate({ params: idParamSchema }),
    asyncHandler(controller.overview),
  );
  router.post(
    '/accounts/:id/databases',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: idParamSchema, body: createDatabaseSchema }),
    asyncHandler(controller.createDatabase),
  );
  router.post(
    '/accounts/:id/database-users',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: idParamSchema, body: createDatabaseUserSchema }),
    asyncHandler(controller.createUser),
  );
  router.post(
    '/accounts/:id/database-assignments',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: idParamSchema, body: assignDatabaseUserSchema }),
    asyncHandler(controller.assignUser),
  );
  router.delete(
    '/accounts/:id/databases/:dbName',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: dbNameParamSchema }),
    asyncHandler(controller.deleteDatabase),
  );
  router.delete(
    '/accounts/:id/database-users/:dbUser',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: dbUserParamSchema }),
    asyncHandler(controller.deleteUser),
  );

  return router;
}
