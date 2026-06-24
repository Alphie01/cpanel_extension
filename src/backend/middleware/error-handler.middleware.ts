/* Terminal error handler. Converts any thrown error into the standard envelope.
 * Known ExtensionErrors keep their code/status/details; unknown errors become a
 * generic INTERNAL 500 with NO stack trace, path, or secret leaked to the client. */
import type { ErrorRequestHandler, Request } from 'express';
import { ZodError } from 'zod';
import { ExtErrorCode } from '../../shared/constants/error-codes';
import type { ErrorEnvelope } from '../../shared/types/common.types';
import { isExtensionError } from '../utils/errors';
import type { Logger } from '../utils/logger';

function logFields(req: Request, status: number): Record<string, unknown> {
  return {
    tenantId: req.tenant?.tenantId,
    userId: req.tenant?.userId ?? null,
    requestId: req.requestId,
    operation: `${req.method} ${req.path}`,
    status: String(status),
  };
}

export function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next): void => {
    if (isExtensionError(err)) {
      logger.warn('Handled extension error', {
        ...logFields(req, err.httpStatus),
        code: err.code,
        details: err.details,
      });
      res.status(err.httpStatus).json(err.toEnvelope());
      return;
    }

    if (err instanceof ZodError) {
      const envelope: ErrorEnvelope = {
        error: {
          code: ExtErrorCode.VALIDATION_FAILED,
          message: 'Request validation failed.',
          details: { issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) },
        },
      };
      res.status(422).json(envelope);
      return;
    }

    // Unknown error: log full detail server-side (redacted), return a safe body.
    logger.error('Unhandled error', {
      ...logFields(req, 500),
      error: err instanceof Error ? err.message : String(err),
    });
    const envelope: ErrorEnvelope = {
      error: { code: ExtErrorCode.INTERNAL, message: 'An unexpected error occurred.', details: {} },
    };
    res.status(500).json(envelope);
  };
}
