/* Account business logic: list/detail from the synced cache, single-account
 * refresh via WHM accountsummary, and derived metrics. Tenant scoping flows
 * through ctx.tenantId on every repo call. */
import type { ListAccountsQuery } from '../../shared/schemas/account.schema';
import type { AccountDto, AccountMetricsDto } from '../../shared/types/account.types';
import type { Paginated } from '../../shared/types/common.types';
import type { TenantContext } from '../context/tenant-context.types';
import { toAccountDto, toAccountMetricsDto } from '../dto/account.dto';
import type { AccountsRepository } from '../repositories/accounts.repository';
import type { ServersRepository } from '../repositories/servers.repository';
import type { TokensRepository } from '../repositories/tokens.repository';
import { writeAudit, type AuditSink } from '../utils/audit';
import type { CryptoService } from '../utils/crypto';
import { Errors } from '../utils/errors';
import { parseWhmAccount } from '../utils/whm-account-parse';
import type { WhmApiClient, WhmCredentials } from './whm-api.client';

export class AccountsService {
  constructor(
    private readonly accounts: AccountsRepository,
    private readonly servers: ServersRepository,
    private readonly tokens: TokensRepository,
    private readonly crypto: CryptoService,
    private readonly whm: WhmApiClient,
    private readonly audit: AuditSink,
  ) {}

  async list(ctx: TenantContext, query: ListAccountsQuery): Promise<Paginated<AccountDto>> {
    const skip = (query.page - 1) * query.pageSize;
    const { rows, total } = await this.accounts.list(ctx.tenantId, {
      serverId: query.serverId,
      search: query.search,
      suspended: query.suspended,
      skip,
      take: query.pageSize,
    });
    return {
      items: rows.map(toAccountDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getById(ctx: TenantContext, id: string): Promise<AccountDto> {
    const row = await this.accounts.findById(ctx.tenantId, id);
    if (!row) throw Errors.notFound('Account');
    return toAccountDto(row);
  }

  async getMetrics(ctx: TenantContext, id: string): Promise<AccountMetricsDto> {
    const row = await this.accounts.findById(ctx.tenantId, id);
    if (!row) throw Errors.notFound('Account');
    return toAccountMetricsDto(row);
  }

  async refresh(ctx: TenantContext, id: string): Promise<AccountDto> {
    const account = await this.accounts.findById(ctx.tenantId, id);
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

    const summary = await this.whm.accountSummary(creds, account.cpanelUser);
    if (!summary) throw Errors.notFound('Account on server');

    const now = new Date();
    const updated = await this.accounts.upsertOne(
      ctx.tenantId,
      account.serverId,
      parseWhmAccount(summary),
      now,
    );
    await this.tokens.markUsed(ctx.tenantId, token.id, now);
    await writeAudit(this.audit, ctx, {
      action: 'account.refresh',
      entityType: 'account',
      entityId: id,
      metadata: { cpanelUser: account.cpanelUser, serverId: account.serverId },
    });
    return toAccountDto(updated);
  }
}
