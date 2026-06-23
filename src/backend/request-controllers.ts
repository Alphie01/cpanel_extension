/* The set of controllers resolved per request. In the out-of-process model each
 * request carries its own DSN + encryption key (via x-ext-env-* headers), so the
 * controllers (and the Prisma client / crypto behind them) are built per request
 * and cached by (DSN, key). In the in-process model a single static set is reused. */
import type { Request } from 'express';
import type { AccountsController } from './controllers/accounts.controller';
import type { DatabasesController } from './controllers/databases.controller';
import type { DomainsController } from './controllers/domains.controller';
import type { EmailController } from './controllers/email.controller';
import type { ServersController } from './controllers/servers.controller';
import type { TokensController } from './controllers/tokens.controller';

export interface RequestControllers {
  serversController: ServersController;
  tokensController: TokensController;
  accountsController: AccountsController;
  emailController: EmailController;
  domainsController: DomainsController;
  databasesController: DatabasesController;
}

/** Resolves the controllers to use for a given request. May throw a
 *  NOT_CONFIGURED ExtensionError if the request lacks a DSN / encryption key. */
export type DepsFactory = (req: Request) => RequestControllers | Promise<RequestControllers>;
