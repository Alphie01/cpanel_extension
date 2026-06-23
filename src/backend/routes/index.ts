/* Assembles the tenant-scoped API router: applies tenant context once, then
 * mounts the implemented (servers, tokens) and stubbed (accounts, deployments)
 * feature routers. */
import { Router } from 'express';
import type { TenantContextProvider } from '../context/tenant-context.types';
import type { AccountsController } from '../controllers/accounts.controller';
import type { DatabasesController } from '../controllers/databases.controller';
import type { DomainsController } from '../controllers/domains.controller';
import type { EmailController } from '../controllers/email.controller';
import type { ServersController } from '../controllers/servers.controller';
import type { TokensController } from '../controllers/tokens.controller';
import { tenantContext } from '../middleware/tenant-context.middleware';
import { accountsRoutes } from './accounts.routes';
import { databasesRoutes } from './databases.routes';
import { deploymentsRoutes } from './deployments.routes';
import { domainsRoutes } from './domains.routes';
import { emailRoutes } from './email.routes';
import { serversRoutes } from './servers.routes';
import { tokensRoutes } from './tokens.routes';

export interface ApiRouterDeps {
  contextProvider: TenantContextProvider;
  serversController: ServersController;
  tokensController: TokensController;
  accountsController: AccountsController;
  emailController: EmailController;
  domainsController: DomainsController;
  databasesController: DatabasesController;
}

export function buildApiRouter(deps: ApiRouterDeps): Router {
  const router = Router();
  // Every API route below requires a resolved tenant context.
  router.use(tenantContext(deps.contextProvider));
  router.use(serversRoutes(deps.serversController));
  router.use(tokensRoutes(deps.tokensController));
  router.use(accountsRoutes(deps.accountsController));
  router.use(emailRoutes(deps.emailController));
  router.use(domainsRoutes(deps.domainsController));
  router.use(databasesRoutes(deps.databasesController));
  router.use(deploymentsRoutes());
  return router;
}
