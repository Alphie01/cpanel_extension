/* Sync orchestration: pull WHM accounts into the tenant-scoped cache. Used by
 * both the manual POST /servers/:id/sync endpoint (with the caller's context)
 * and the scheduled worker (with a system context for the assigned tenant).
 * Idempotent: re-syncing upserts, never duplicates. */
import { EXTENSION_SLUG, type TenantContext } from '../context/tenant-context.types';
import type { AccountsRepository } from '../repositories/accounts.repository';
import type { ServersRepository } from '../repositories/servers.repository';
import type { TokensRepository } from '../repositories/tokens.repository';
import { writeAudit, type AuditSink } from '../utils/audit';
import type { CryptoService } from '../utils/crypto';
import { Errors, isExtensionError } from '../utils/errors';
import type { Logger } from '../utils/logger';
import { parseWhmAccount } from '../utils/whm-account-parse';
import type { WhmApiClient, WhmCredentials } from './whm-api.client';

export interface SyncSummary {
  servers: number;
  accounts: number;
  failedServers: number;
}

export class HostingSyncService {
  constructor(
    private readonly servers: ServersRepository,
    private readonly accounts: AccountsRepository,
    private readonly tokens: TokensRepository,
    private readonly crypto: CryptoService,
    private readonly whm: WhmApiClient,
    private readonly audit: AuditSink,
    private readonly logger: Logger,
  ) {}

  systemContext(tenantId: string): TenantContext {
    return {
      tenantId,
      userId: null,
      permissions: [],
      extensionSlug: EXTENSION_SLUG,
      requestId: `sync-${tenantId}`,
    };
  }

  async syncTenant(tenantId: string): Promise<SyncSummary> {
    const ctx = this.systemContext(tenantId);
    const { rows } = await this.servers.list(tenantId, { skip: 0, take: 1000 });
    let accounts = 0;
    let failedServers = 0;
    for (const server of rows) {
      try {
        accounts += await this.syncServer(ctx, server.id);
      } catch {
        failedServers += 1;
      }
    }
    this.logger.info('Tenant sync complete', {
      tenantId,
      operation: 'sync.tenant',
      status: 'SUCCESS',
      servers: rows.length,
      accounts,
      failedServers,
    });
    return { servers: rows.length, accounts, failedServers };
  }

  async syncServer(ctx: TenantContext, serverId: string): Promise<number> {
    const server = await this.servers.findById(ctx.tenantId, serverId);
    if (!server) throw Errors.notFound('Server');

    const token = await this.tokens.findActiveForServer(ctx.tenantId, serverId, 'WHM');
    if (!token) {
      await writeAudit(this.audit, ctx, {
        action: 'account.sync',
        entityType: 'server',
        entityId: serverId,
        status: 'FAILURE',
        metadata: { reason: 'no_active_token' },
      });
      throw Errors.validation('No active WHM token is configured for this server.');
    }

    const creds: WhmCredentials = {
      hostname: server.hostname,
      port: server.port,
      user: token.whmUser,
      token: this.crypto.decrypt(token.tokenEnc, token.keyId),
      verifySsl: server.verifySsl,
    };

    const checkedAt = new Date();
    let count = 0;
    try {
      const rawAccounts = await this.whm.listAccounts(creds);
      const parsed = rawAccounts.map((r) => parseWhmAccount(r));
      count = await this.accounts.upsertMany(ctx.tenantId, serverId, parsed, checkedAt);
      await this.tokens.markUsed(ctx.tenantId, token.id, checkedAt);
      await this.servers.setStatus(ctx.tenantId, serverId, 'ACTIVE', null, checkedAt);
    } catch (err) {
      const message = isExtensionError(err) ? err.message : 'Sync failed.';
      await this.servers.setStatus(ctx.tenantId, serverId, 'UNREACHABLE', message, checkedAt);
      await writeAudit(this.audit, ctx, {
        action: 'account.sync',
        entityType: 'server',
        entityId: serverId,
        status: 'FAILURE',
        metadata: { reason: 'whm_error' },
      });
      throw err;
    }

    await writeAudit(this.audit, ctx, {
      action: 'account.sync',
      entityType: 'server',
      entityId: serverId,
      metadata: { count },
    });
    return count;
  }
}
