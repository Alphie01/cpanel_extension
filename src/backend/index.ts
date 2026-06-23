/* Extension backend entrypoint. The host (in-process) or standalone.ts
 * (out-of-process) mounts the router returned by createRouter() at the manifest
 * apiPrefix (/api/extensions/cpanel-whm-manager). createRouter takes a context
 * provider + a per-request deps factory + a logger; it does NOT call
 * app.listen() — see standalone.ts for local/container dev. */
import express, { type Request, type Response, type Router } from 'express';
import type { TenantContextProvider } from './context/tenant-context.types';
import { errorHandler } from './middleware/error-handler.middleware';
import { requestContext } from './middleware/request-context.middleware';
import type { DepsFactory } from './request-controllers';
import { buildApiRouter } from './routes';
import type { Logger } from './utils/logger';

export { createContainer, createRequestControllersFactory } from './container';
export type { AppDependencies } from './container';
export type { RequestControllers, DepsFactory } from './request-controllers';
export const API_PREFIX = '/api/extensions/cpanel-whm-manager';

export interface CreateRouterOptions {
  contextProvider: TenantContextProvider;
  depsFactory: DepsFactory;
  logger: Logger;
}

export function createRouter(opts: CreateRouterOptions): Router {
  const router = express.Router();

  // Scoped body parser + correlation id for this extension's routes.
  router.use(express.json({ limit: '1mb' }));
  router.use(requestContext());

  // Unauthenticated liveness probe (manifest backend.healthcheck = /health).
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, extension: 'cpanel-whm-manager' });
  });

  router.use(buildApiRouter({ contextProvider: opts.contextProvider, depsFactory: opts.depsFactory }));

  // Terminal error handler — owns the standard envelope for this extension.
  router.use(errorHandler(opts.logger));

  return router;
}
