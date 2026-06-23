/* Local/standalone dev server. NOT the production entrypoint (the host mounts
 * createRouter in-process). Boots a container from the environment, mounts the
 * router at the manifest apiPrefix, and listens. Used by Dockerfile/healthcheck. */
import 'dotenv/config';
import express from 'express';
import { API_PREFIX, createContainer, createRouter } from './index';

function main(): void {
  const deps = createContainer();
  const app = express();

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use(API_PREFIX, createRouter(deps));

  const server = app.listen(deps.port, () => {
    deps.logger.info('Extension standalone server listening', { operation: 'boot', port: deps.port });
  });

  const shutdown = (): void => {
    server.close(() => {
      void deps.dispose().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
