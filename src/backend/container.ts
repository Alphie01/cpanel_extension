/* Composition root. Builds the dependency graph from the validated environment:
 * Prisma client → repositories → services → controllers, plus crypto, the WHM
 * client, the audit sink, the logger, and the tenant-context provider selected
 * by EXT_HOSTING_TENANT_CONTEXT_MODE. The single place the real PrismaClient is
 * cast to the narrow HostingPrismaClient shape. */
import { AuthenticatedContextProvider } from './context/authenticated-provider';
import { HeaderContextProvider } from './context/header-provider';
import type { TenantContextProvider } from './context/tenant-context.types';
import { AccountsController } from './controllers/accounts.controller';
import { DatabasesController } from './controllers/databases.controller';
import { DomainsController } from './controllers/domains.controller';
import { EmailController } from './controllers/email.controller';
import { ServersController } from './controllers/servers.controller';
import { TokensController } from './controllers/tokens.controller';
import type { HostingPrismaClient } from './repositories/hosting-prisma';
import { PrismaAccountsRepository } from './repositories/accounts.repository';
import { PrismaOperationLogRepository } from './repositories/operation-log.repository';
import { PrismaServersRepository } from './repositories/servers.repository';
import { PrismaTokensRepository } from './repositories/tokens.repository';
import { AccountWhmResolver } from './services/account-whm-context';
import { AccountsService } from './services/accounts.service';
import { createCpanelApiClient } from './services/cpanel-api.client';
import { DatabasesService } from './services/databases.service';
import { DomainsService } from './services/domains.service';
import { EmailService } from './services/email.service';
import { HostingSyncService, type SyncSummary } from './services/hosting-sync.service';
import { ServersService } from './services/servers.service';
import { TokensService } from './services/tokens.service';
import { createNodeHttpClient, createWhmApiClient } from './services/whm-api.client';
import { createCryptoService } from './utils/crypto';
import { loadEnv, type EnvConfig } from './utils/env';
import { createLogger, type Logger } from './utils/logger';

export interface AppDependencies {
  contextProvider: TenantContextProvider;
  serversController: ServersController;
  tokensController: TokensController;
  accountsController: AccountsController;
  emailController: EmailController;
  domainsController: DomainsController;
  databasesController: DatabasesController;
  syncTenant: (tenantId: string) => Promise<SyncSummary>;
  logger: Logger;
  port: number;
  dispose: () => Promise<void>;
}

interface DisposablePrisma extends HostingPrismaClient {
  $disconnect(): Promise<void>;
}

function createPrismaClient(env: EnvConfig): DisposablePrisma {
  // Loaded via require so typecheck does not depend on `prisma generate` having
  // run; the real client is structurally compatible with HostingPrismaClient.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client') as { PrismaClient: new (opts: unknown) => unknown };
  const client = new PrismaClient({ datasources: { db: { url: env.databaseUrl } } });
  return client as DisposablePrisma;
}

function selectProvider(env: EnvConfig): TenantContextProvider {
  if (env.tenantContextMode === 'header') {
    return new HeaderContextProvider(env.platformJwtSecret ?? '');
  }
  return new AuthenticatedContextProvider();
}

export function createContainer(env: EnvConfig = loadEnv()): AppDependencies {
  const logger = createLogger();
  const prisma = createPrismaClient(env);

  const crypto = createCryptoService({
    encryptionKey: env.encryptionKey,
    encryptionKeyId: env.encryptionKeyId,
  });
  const whm = createWhmApiClient(
    { timeoutMs: env.whmTimeoutMs, maxRetries: 2, baseBackoffMs: 200 },
    createNodeHttpClient(),
  );
  const cpanel = createCpanelApiClient(whm);

  const serversRepo = new PrismaServersRepository(prisma);
  const tokensRepo = new PrismaTokensRepository(prisma);
  const accountsRepo = new PrismaAccountsRepository(prisma);
  const auditSink = new PrismaOperationLogRepository(prisma);

  const resolver = new AccountWhmResolver(accountsRepo, serversRepo, tokensRepo, crypto);

  const serversService = new ServersService(serversRepo, tokensRepo, crypto, whm, auditSink, logger);
  const tokensService = new TokensService(tokensRepo, serversRepo, crypto, auditSink);
  const accountsService = new AccountsService(accountsRepo, serversRepo, tokensRepo, crypto, whm, auditSink);
  const emailService = new EmailService(resolver, cpanel, auditSink);
  const domainsService = new DomainsService(resolver, cpanel, auditSink, logger);
  const databasesService = new DatabasesService(resolver, cpanel, auditSink);
  const syncService = new HostingSyncService(
    serversRepo,
    accountsRepo,
    tokensRepo,
    crypto,
    whm,
    auditSink,
    logger,
  );

  return {
    contextProvider: selectProvider(env),
    serversController: new ServersController(serversService),
    tokensController: new TokensController(tokensService),
    accountsController: new AccountsController(accountsService, syncService),
    emailController: new EmailController(emailService),
    domainsController: new DomainsController(domainsService),
    databasesController: new DatabasesController(databasesService),
    syncTenant: (tenantId: string) => syncService.syncTenant(tenantId),
    logger,
    port: env.port,
    dispose: () => prisma.$disconnect(),
  };
}
