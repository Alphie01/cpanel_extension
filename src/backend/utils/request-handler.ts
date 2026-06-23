/* Adapts a per-request controller method into an Express handler. Picks the
 * method from req.appDeps (set by the requestDeps middleware) so controllers can
 * be resolved per request (out-of-process model) without route files knowing how
 * they were built. */
import type { Request, RequestHandler, Response } from 'express';
import type { RequestControllers } from '../request-controllers';
import { Errors } from './errors';

type ControllerMethod = (req: Request, res: Response) => Promise<unknown>;

export function reqHandler(pick: (deps: RequestControllers) => ControllerMethod): RequestHandler {
  return (req, res, next) => {
    const deps = req.appDeps;
    if (!deps) {
      next(Errors.internal('Request dependencies were not initialized.'));
      return;
    }
    pick(deps)(req, res).catch(next);
  };
}
