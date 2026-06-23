/* Extension backend entrypoint (in-process model). The host mounts the router
 * returned by createRouter() at the manifest apiPrefix
 * (/api/extensions/cpanel-whm-manager). This module does NOT call app.listen()
 * — see standalone.ts for local dev. */
import express, { type Request, type Response, type Router } from 'express';
import { errorHandler } from './middleware/error-handler.middleware';
import { requestContext } from './middleware/request-context.middleware';
import { buildApiRouter } from './routes';
import type { AppDependencies } from './container';

export { createContainer } from './container';
export type { AppDependencies } from './container';
export const API_PREFIX = '/api/extensions/cpanel-whm-manager';

export function createRouter(deps: AppDependencies): Router {
  const router = express.Router();

  // Scoped body parser + correlation id for this extension's routes.
  router.use(express.json({ limit: '1mb' }));
  router.use(requestContext());

  // Unauthenticated liveness probe (manifest backend.healthcheck = /health).
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, extension: 'cpanel-whm-manager' });
  });

  router.use(buildApiRouter(deps));

  // Terminal error handler — owns the standard envelope for this extension.
  router.use(errorHandler(deps.logger));

  return router;
}
