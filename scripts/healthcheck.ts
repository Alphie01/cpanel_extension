/* Process-exit health probe for Docker HEALTHCHECK / `npm run healthcheck`.
 * GETs /health on the standalone server; exits 0 if healthy, 1 otherwise. */
import { get } from 'node:http';

const port = Number(process.env.PORT ?? 11000);

const req = get(`http://localhost:${port}/health`, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});

req.on('error', () => process.exit(1));
req.setTimeout(4000, () => {
  req.destroy();
  process.exit(1);
});
