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
import { requirePermission } from '../middleware/require-permission.middleware';
import { validate } from '../middleware/validate.middleware';
import { reqHandler } from '../utils/request-handler';
import { idParamSchema } from '../validators/common.validators';

export function databasesRoutes(): Router {
  const router = Router();

  router.get(
    '/accounts/:id/databases',
    requirePermission(PERMISSIONS.databases.view),
    validate({ params: idParamSchema }),
    reqHandler((d) => d.databasesController.overview),
  );
  router.post(
    '/accounts/:id/databases',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: idParamSchema, body: createDatabaseSchema }),
    reqHandler((d) => d.databasesController.createDatabase),
  );
  router.post(
    '/accounts/:id/database-users',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: idParamSchema, body: createDatabaseUserSchema }),
    reqHandler((d) => d.databasesController.createUser),
  );
  router.post(
    '/accounts/:id/database-assignments',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: idParamSchema, body: assignDatabaseUserSchema }),
    reqHandler((d) => d.databasesController.assignUser),
  );
  router.delete(
    '/accounts/:id/databases/:dbName',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: dbNameParamSchema }),
    reqHandler((d) => d.databasesController.deleteDatabase),
  );
  router.delete(
    '/accounts/:id/database-users/:dbUser',
    requirePermission(PERMISSIONS.databases.manage),
    validate({ params: dbUserParamSchema }),
    reqHandler((d) => d.databasesController.deleteUser),
  );

  return router;
}
