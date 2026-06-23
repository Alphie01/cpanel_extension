/* Resolves the per-request controller set via the configured factory and
 * attaches it to req.appDeps. Runs after tenantContext so the factory can read
 * tenant/headers. A factory that throws (e.g. NOT_CONFIGURED) flows to the
 * error handler. */
import type { RequestHandler } from 'express';
import type { DepsFactory } from '../request-controllers';

export function requestDeps(factory: DepsFactory): RequestHandler {
  return (req, _res, next) => {
    try {
      Promise.resolve(factory(req))
        .then((deps) => {
          req.appDeps = deps;
          next();
        })
        .catch(next);
    } catch (err) {
      next(err);
    }
  };
}
