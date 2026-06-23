/* Resolves the WHM credentials for operating on a specific cPanel account:
 * loads the (tenant-scoped) account + its server + the server's active WHM
 * token, then decrypts the token. Shared by the email, domains, and databases
 * services so the "account → WHM creds" logic lives in exactly one place. */
import type { TenantContext } from '../context/tenant-context.types';
import type { AccountsRepository } from '../repositories/accounts.repository';
import type { AccountRow } from '../repositories/hosting-prisma';
import type { ServersRepository } from '../repositories/servers.repository';
import type { TokensRepository } from '../repositories/tokens.repository';
import type { CryptoService } from '../utils/crypto';
import { Errors } from '../utils/errors';
import type { WhmCredentials } from './whm-api.client';

export interface AccountWhmContext {
  creds: WhmCredentials;
  account: AccountRow;
}

export class AccountWhmResolver {
  constructor(
    private readonly accounts: AccountsRepository,
    private readonly servers: ServersRepository,
    private readonly tokens: TokensRepository,
    private readonly crypto: CryptoService,
  ) {}

  async resolve(ctx: TenantContext, accountId: string): Promise<AccountWhmContext> {
    const account = await this.accounts.findById(ctx.tenantId, accountId);
    if (!account) throw Errors.notFound('Account');
    const server = await this.servers.findById(ctx.tenantId, account.serverId);
    if (!server) throw Errors.notFound('Server');
    const token = await this.tokens.findActiveForServer(ctx.tenantId, account.serverId, 'WHM');
    if (!token) throw Errors.validation('No active WHM token is configured for this server.');
    const creds: WhmCredentials = {
      hostname: server.hostname,
      port: server.port,
      user: token.whmUser,
      token: this.crypto.decrypt(token.tokenEnc, token.keyId),
      verifySsl: server.verifySsl,
    };
    return { creds, account };
  }
}
