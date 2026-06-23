/* Builds a fully-wired Express app over in-memory fakes — the real router,
 * middleware, services, crypto, and a stubbed WHM client — so HTTP-level tests
 * run without a database or network. */
import express, { type Express } from 'express';
import { API_PREFIX, createRouter } from '../../src/backend/index';
import { AccountsController } from '../../src/backend/controllers/accounts.controller';
import { DatabasesController } from '../../src/backend/controllers/databases.controller';
import { DomainsController } from '../../src/backend/controllers/domains.controller';
import { EmailController } from '../../src/backend/controllers/email.controller';
import { ServersController } from '../../src/backend/controllers/servers.controller';
import { TokensController } from '../../src/backend/controllers/tokens.controller';
import { AccountWhmResolver } from '../../src/backend/services/account-whm-context';
import { AccountsService } from '../../src/backend/services/accounts.service';
import type { CpanelApiClient } from '../../src/backend/services/cpanel-api.client';
import { DatabasesService } from '../../src/backend/services/databases.service';
import { DomainsService } from '../../src/backend/services/domains.service';
import { EmailService } from '../../src/backend/services/email.service';
import { HostingSyncService } from '../../src/backend/services/hosting-sync.service';
import { ServersService } from '../../src/backend/services/servers.service';
import { TokensService } from '../../src/backend/services/tokens.service';
import type { WhmApiClient } from '../../src/backend/services/whm-api.client';
import type { RequestControllers } from '../../src/backend/request-controllers';
import { createCryptoService, type CryptoService } from '../../src/backend/utils/crypto';
import type { Logger } from '../../src/backend/utils/logger';
import {
  InMemoryAccountsRepository,
  InMemoryAuditSink,
  InMemoryServersRepository,
  InMemoryTokensRepository,
  TestContextProvider,
} from './fakes';

export const TEST_ENCRYPTION_KEY = Buffer.alloc(32, 7);
export const API_BASE = API_PREFIX;

const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  child: () => silentLogger,
};

export function fakeWhmClient(overrides: Partial<WhmApiClient> = {}): WhmApiClient {
  return {
    testConnection: async () => ({ version: '11.110.0.5' }),
    listAccounts: async () => [],
    accountSummary: async () => null,
    call: async () => ({}) as never,
    ...overrides,
  };
}

export function fakeCpanelClient(overrides: Partial<CpanelApiClient> = {}): CpanelApiClient {
  return {
    listEmailAccounts: async () => [],
    createEmailAccount: async () => undefined,
    deleteEmailAccount: async () => undefined,
    setEmailPassword: async () => undefined,
    setEmailQuota: async () => undefined,
    setEmailSuspended: async () => undefined,
    listDomains: async () => ({ main: null, addon: [], sub: [], parked: [] }),
    listSslDomains: async () => [],
    triggerAutoSsl: async () => undefined,
    listDatabases: async () => [],
    listDatabaseUsers: async () => [],
    createDatabase: async () => undefined,
    createDatabaseUser: async () => undefined,
    assignDatabaseUser: async () => undefined,
    deleteDatabase: async () => undefined,
    deleteDatabaseUser: async () => undefined,
    ...overrides,
  };
}

export interface TestHarness {
  app: Express;
  serversRepo: InMemoryServersRepository;
  tokensRepo: InMemoryTokensRepository;
  accountsRepo: InMemoryAccountsRepository;
  audit: InMemoryAuditSink;
  crypto: CryptoService;
  syncService: HostingSyncService;
  syncTenant: (tenantId: string) => Promise<{ servers: number; accounts: number; failedServers: number }>;
}

export function buildTestApp(opts: { whm?: WhmApiClient; cpanel?: CpanelApiClient } = {}): TestHarness {
  const serversRepo = new InMemoryServersRepository();
  const tokensRepo = new InMemoryTokensRepository();
  const accountsRepo = new InMemoryAccountsRepository();
  const audit = new InMemoryAuditSink();
  const crypto = createCryptoService({
    encryptionKey: TEST_ENCRYPTION_KEY,
    encryptionKeyId: 'default',
  });
  const whm = opts.whm ?? fakeWhmClient();
  const cpanel = opts.cpanel ?? fakeCpanelClient();

  const resolver = new AccountWhmResolver(accountsRepo, serversRepo, tokensRepo, crypto);

  const serversService = new ServersService(serversRepo, tokensRepo, crypto, whm, audit, silentLogger);
  const tokensService = new TokensService(tokensRepo, serversRepo, crypto, audit);
  const accountsService = new AccountsService(accountsRepo, serversRepo, tokensRepo, crypto, whm, audit);
  const emailService = new EmailService(resolver, cpanel, audit);
  const domainsService = new DomainsService(resolver, cpanel, audit, silentLogger);
  const databasesService = new DatabasesService(resolver, cpanel, audit);
  const syncService = new HostingSyncService(
    serversRepo,
    accountsRepo,
    tokensRepo,
    crypto,
    whm,
    audit,
    silentLogger,
  );

  const controllers: RequestControllers = {
    serversController: new ServersController(serversService),
    tokensController: new TokensController(tokensService),
    accountsController: new AccountsController(accountsService, syncService),
    emailController: new EmailController(emailService),
    domainsController: new DomainsController(domainsService),
    databasesController: new DatabasesController(databasesService),
  };

  const app = express();
  app.use(
    API_BASE,
    createRouter({
      contextProvider: new TestContextProvider(),
      depsFactory: () => controllers,
      logger: silentLogger,
    }),
  );
  return {
    app,
    serversRepo,
    tokensRepo,
    accountsRepo,
    audit,
    crypto,
    syncService,
    syncTenant: (tenantId: string) => syncService.syncTenant(tenantId),
  };
}
