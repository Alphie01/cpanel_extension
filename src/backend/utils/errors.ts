/* Standard extension error + envelope. Matches CLAUDE.md error format:
 *   { "error": { "code", "message", "details" } }
 * Never carries secrets, stack traces, connection URLs, or internal paths. */
import { ExtErrorCode } from '../../shared/constants/error-codes';
import type { ErrorEnvelope } from '../../shared/types/common.types';

export class ExtensionError extends Error {
  public readonly code: ExtErrorCode;
  public readonly httpStatus: number;
  public readonly details: Record<string, unknown>;

  constructor(
    code: ExtErrorCode,
    message: string,
    httpStatus: number,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ExtensionError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    Object.setPrototypeOf(this, ExtensionError.prototype);
  }

  toEnvelope(): ErrorEnvelope {
    return { error: { code: this.code, message: this.message, details: this.details } };
  }
}

export function isExtensionError(err: unknown): err is ExtensionError {
  return err instanceof ExtensionError;
}

// ─── Convenience constructors ───────────────────────────────────────────────
export const Errors = {
  validation: (message: string, details?: Record<string, unknown>) =>
    new ExtensionError(ExtErrorCode.VALIDATION_FAILED, message, 422, details),
  unauthenticated: (message = 'Authentication required.') =>
    new ExtensionError(ExtErrorCode.UNAUTHENTICATED, message, 401),
  forbidden: (message = 'You do not have permission to perform this action.', details?: Record<string, unknown>) =>
    new ExtensionError(ExtErrorCode.FORBIDDEN, message, 403, details),
  tenantContextMissing: (message = 'Tenant context could not be established.') =>
    new ExtensionError(ExtErrorCode.TENANT_CONTEXT_MISSING, message, 401),
  notFound: (entity: string) =>
    new ExtensionError(ExtErrorCode.NOT_FOUND, `${entity} not found.`, 404),
  conflict: (message: string, details?: Record<string, unknown>) =>
    new ExtensionError(ExtErrorCode.CONFLICT, message, 409, details),
  notImplemented: (feature: string) =>
    new ExtensionError(
      ExtErrorCode.NOT_IMPLEMENTED,
      `${feature} is not implemented in this release.`,
      501,
      { feature },
    ),
  internal: (message = 'An unexpected error occurred.') =>
    new ExtensionError(ExtErrorCode.INTERNAL, message, 500),
};
