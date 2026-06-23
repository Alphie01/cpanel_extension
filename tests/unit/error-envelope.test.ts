import { describe, expect, it } from 'vitest';
import { ExtErrorCode } from '../../src/shared/constants/error-codes';
import { Errors, ExtensionError, isExtensionError } from '../../src/backend/utils/errors';

describe('error envelope', () => {
  it('serializes to { error: { code, message, details } }', () => {
    const err = new ExtensionError(ExtErrorCode.CONFLICT, 'duplicate', 409, { name: 'x' });
    expect(err.toEnvelope()).toEqual({
      error: { code: 'CONFLICT', message: 'duplicate', details: { name: 'x' } },
    });
  });

  it('notImplemented yields a 501 NOT_IMPLEMENTED', () => {
    const err = Errors.notImplemented('Some feature');
    expect(err.httpStatus).toBe(501);
    expect(err.code).toBe(ExtErrorCode.NOT_IMPLEMENTED);
    expect(err.details).toEqual({ feature: 'Some feature' });
  });

  it('isExtensionError narrows correctly', () => {
    expect(isExtensionError(Errors.notFound('Server'))).toBe(true);
    expect(isExtensionError(new Error('plain'))).toBe(false);
  });
});
