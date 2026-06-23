/* Assembles the tenant-scoped API router: resolves tenant context, then the
 * per-request controller set, then mounts the feature routers (which pull their
 * controller from req.appDeps via reqHandler). */
import { Router } from 'express';
import type { TenantContextProvider } from '../context/tenant-context.types';
import { requestDeps } from '../middleware/request-deps.middleware';
import { tenantContext } from '../middleware/tenant-context.middleware';
import type { DepsFactory } from '../request-controllers';
import { accountsRoutes } from './accounts.routes';
import { databasesRoutes } from './databases.routes';
import { deploymentsRoutes } from './deployments.routes';
import { domainsRoutes } from './domains.routes';
import { emailRoutes } from './email.routes';
import { serversRoutes } from './servers.routes';
import { tokensRoutes } from './tokens.routes';

export interface ApiRouterDeps {
  contextProvider: TenantContextProvider;
  depsFactory: DepsFactory;
}

export function buildApiRouter(deps: ApiRouterDeps): Router {
  const router = Router();
  // Every API route below requires a resolved tenant context + per-request deps.
  router.use(tenantContext(deps.contextProvider));
  router.use(requestDeps(deps.depsFactory));
  router.use(serversRoutes());
  router.use(tokensRoutes());
  router.use(accountsRoutes());
  router.use(emailRoutes());
  router.use(domainsRoutes());
  router.use(databasesRoutes());
  router.use(deploymentsRoutes());
  return router;
}
