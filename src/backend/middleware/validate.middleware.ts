/* Zod validation adapter. Parses body/query/params against the given schemas and
 * stashes the typed results on req.validated. A failure becomes a standard
 * VALIDATION_FAILED (422) envelope with per-field issues in `details`. */
import type { RequestHandler } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { Errors } from '../utils/errors';

export interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function formatIssues(err: ZodError): Record<string, unknown> {
  return {
    issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  };
}

export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next): void => {
    try {
      const validated: { body?: unknown; query?: unknown; params?: unknown } = {};
      if (schemas.params) validated.params = schemas.params.parse(req.params);
      if (schemas.query) validated.query = schemas.query.parse(req.query);
      if (schemas.body) validated.body = schemas.body.parse(req.body);
      req.validated = validated;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(Errors.validation('Request validation failed.', formatIssues(err)));
        return;
      }
      next(err);
    }
  };
}
