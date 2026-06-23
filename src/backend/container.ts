/* Composition root. Two assembly modes:
 *
 *  - createContainer(env): builds everything ONCE from boot env (DSN + key
 *    required). Used by the in-process host and the scheduled worker (which the
 *    platform runs with per-tenant env).
 *
 *  - createRequestControllersFactory(bootEnv): returns a DepsFactory that builds
 *    controllers PER REQUEST from x-ext-env-* headers (DSN + key), cached by
 *    (DSN, key). Used by the out-of-process container, which boots with no
 *    secrets and receives them per request — see standalone.ts.
 *
 * The single place the real PrismaClient is cast to the narrow HostingPrismaClient. */
import type { Request } from 'express';
import { ExtErrorCode } from '../shared/constants/error-codes';
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
import type { RequestControllers, DepsFactory } from './request-controllers';
import { AccountWhmResolver } from './services/account-whm-context';
import { AccountsService } from './services/accounts.service';
import { createCpanelApiClient, type CpanelApiClient } from './services/cpanel-api.client';
import { DatabasesService } from './services/databases.service';
import { DomainsService } from './services/domains.service';
import { EmailService } from './services/email.service';
import { HostingSyncService, type SyncSummary } from './services/hosting-sync.service';
import { ServersService } from './services/servers.service';
import { TokensService } from './services/tokens.service';
import { createNodeHttpClient, createWhmApiClient, type WhmApiClient, type WhmClientConfig } from './services/whm-api.client';
import { createCryptoService, type CryptoService } from './utils/crypto';
import { loadBootEnv, loadEnv, type BootConfig, type EnvConfig, type TenantContextMode } from './utils/env';
import { ExtensionError } from './utils/errors';
import { createLogger, type Logger } from './utils/logger';

export interface AppDependencies extends RequestControllers {
  contextProvider: TenantContextProvider;
  syncTenant: (tenantId: string) => Promise<SyncSummary>;
  logger: Logger;
  port: number;
  dispose: () => Promise<void>;
}

interface DisposablePrisma extends HostingPrismaClient {
  $disconnect(): Promise<void>;
}

interface BuiltServices {
  controllers: RequestControllers;
  syncService: HostingSyncService;
}

function createPrismaClient(databaseUrl: string): DisposablePrisma {
  // Loaded via require so typecheck does not depend on `prisma generate` having
  // run; the real client is structurally compatible with HostingPrismaClient.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client') as { PrismaClient: new (opts: unknown) => unknown };
  const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  return client as DisposablePrisma;
}

function selectProvider(config: {
  tenantContextMode: TenantContextMode;
  platformJwtSecret: string | null;
}): TenantContextProvider {
  if (config.tenantContextMode === 'header') {
    return new HeaderContextProvider(config.platformJwtSecret ?? '');
  }
  return new AuthenticatedContextProvider();
}

function header(req: Request, name: string): string | null {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' ? value : null;
}

/** Per-tenant secrets arrive as x-ext-env-<lowercased key> (echo contract). */
function extEnv(req: Request, lowerKey: string): string | null {
  return header(req, `x-ext-env-${lowerKey}`);
}

/** Build the full service graph from a Prisma client + crypto + shared clients. */
function buildServices(deps: {
  prisma: HostingPrismaClient;
  crypto: CryptoService;
  whm: WhmApiClient;
  cpanel: CpanelApiClient;
  logger: Logger;
}): BuiltServices {
  const serversRepo = new PrismaServersRepository(deps.prisma);
  const tokensRepo = new PrismaTokensRepository(deps.prisma);
  const accountsRepo = new PrismaAccountsRepository(deps.prisma);
  const auditSink = new PrismaOperationLogRepository(deps.prisma);
  const resolver = new AccountWhmResolver(accountsRepo, serversRepo, tokensRepo, deps.crypto);

  const serversService = new ServersService(serversRepo, tokensRepo, deps.crypto, deps.whm, auditSink, deps.logger);
  const tokensService = new TokensService(tokensRepo, serversRepo, deps.crypto, auditSink);
  const accountsService = new AccountsService(accountsRepo, serversRepo, tokensRepo, deps.crypto, deps.whm, auditSink);
  const emailService = new EmailService(resolver, deps.cpanel, auditSink);
  const domainsService = new DomainsService(resolver, deps.cpanel, auditSink, deps.logger);
  const databasesService = new DatabasesService(resolver, deps.cpanel, auditSink);
  const syncService = new HostingSyncService(serversRepo, accountsRepo, tokensRepo, deps.crypto, deps.whm, auditSink, deps.logger);

  return {
    controllers: {
      serversController: new ServersController(serversService),
      tokensController: new TokensController(tokensService),
      accountsController: new AccountsController(accountsService, syncService),
      emailController: new EmailController(emailService),
      domainsController: new DomainsController(domainsService),
      databasesController: new DatabasesController(databasesService),
    },
    syncService,
  };
}

function whmConfig(timeoutMs: number): WhmClientConfig {
  return { timeoutMs, maxRetries: 2, baseBackoffMs: 200 };
}

export function createContainer(env: EnvConfig = loadEnv()): AppDependencies {
  const logger = createLogger();
  const prisma = createPrismaClient(env.databaseUrl);
  const crypto = createCryptoService({
    encryptionKey: env.encryptionKey,
    encryptionKeyId: env.encryptionKeyId,
  });
  const whm = createWhmApiClient(whmConfig(env.whmTimeoutMs), createNodeHttpClient());
  const cpanel = createCpanelApiClient(whm);

  const { controllers, syncService } = buildServices({ prisma, crypto, whm, cpanel, logger });

  return {
    ...controllers,
    contextProvider: selectProvider(env),
    syncTenant: (tenantId: string) => syncService.syncTenant(tenantId),
    logger,
    port: env.port,
    dispose: () => prisma.$disconnect(),
  };
}

/** Out-of-process factory: build controllers per request from x-ext-env-* (DSN +
 *  key), cached by (DSN, key). WHM/cPanel clients + logger are shared. */
export function createRequestControllersFactory(bootEnv: BootConfig = loadBootEnv()): DepsFactory {
  const logger = createLogger();
  const whm = createWhmApiClient(whmConfig(bootEnv.whmTimeoutMs), createNodeHttpClient());
  const cpanel = createCpanelApiClient(whm);
  const cache = new Map<string, RequestControllers>();

  return (req: Request): RequestControllers => {
    const keyB64 = extEnv(req, 'ext_hosting_encryption_key') ?? process.env.EXT_HOSTING_ENCRYPTION_KEY ?? null;
    const databaseUrl = extEnv(req, 'database_url') ?? process.env.DATABASE_URL ?? null;
    if (!keyB64 || !databaseUrl) {
      throw new ExtensionError(
        ExtErrorCode.NOT_CONFIGURED,
        'Extension is not configured for this tenant (missing encryption key or database URL).',
        503,
      );
    }
    const cacheKey = `${databaseUrl}::${keyB64}`;
    let controllers = cache.get(cacheKey);
    if (!controllers) {
      const crypto = createCryptoService({
        encryptionKey: Buffer.from(keyB64, 'base64'),
        encryptionKeyId: 'default',
      });
      const prisma = createPrismaClient(databaseUrl);
      controllers = buildServices({ prisma, crypto, whm, cpanel, logger }).controllers;
      cache.set(cacheKey, controllers);
    }
    return controllers;
  };
}
