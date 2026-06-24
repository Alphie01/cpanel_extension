/* Out-of-process container entrypoint (also local dev). Boots with NO per-tenant
 * secrets — the encryption key + DSN arrive per request as x-ext-env-* headers
 * (echo contract). Always serves /health; API routes return 503 NOT_CONFIGURED
 * until a request provides (or the env supplies) a key + DSN. */
import 'dotenv/config';
import express from 'express';
import { HeaderContextProvider } from './context/header-provider';
import { API_PREFIX, createRequestControllersFactory, createRouter } from './index';
import { loadBootEnv } from './utils/env';
import { createLogger } from './utils/logger';

function main(): void {
  const bootEnv = loadBootEnv();
  const logger = createLogger();

  // The out-of-process container ALWAYS resolves tenant context from gateway
  // headers (x-tenant-id, x-user-id, …) regardless of EXT_HOSTING_TENANT_CONTEXT_MODE.
  // HMAC is enforced when a JWT secret + x-ext-token are present; otherwise the
  // network is trusted (the container is reachable only via the gateway).
  const contextProvider = new HeaderContextProvider(bootEnv.platformJwtSecret ?? '');
  const depsFactory = createRequestControllersFactory(bootEnv);

  const app = express();
  // Root health probe (manifest healthUrl) — never depends on tenant config.
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Mount at BOTH the apiPrefix and root so the extension works whether the
  // platform gateway forwards `baseUrl + apiPrefix + path` or strips its own
  // prefix and forwards `baseUrl + path` (echo contract: routes served at root).
  const router = createRouter({ contextProvider, depsFactory, logger });
  app.use(API_PREFIX, router);
  app.use('/', router);

  app.listen(bootEnv.port, () => {
    logger.info('Extension standalone server listening', { operation: 'boot', port: bootEnv.port });
  });
}

main();
