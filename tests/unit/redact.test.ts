import { describe, expect, it } from 'vitest';
import { lastFour, redact } from '../../src/backend/utils/redact';

describe('redact', () => {
  it('masks sensitive keys recursively', () => {
    const out = redact({
      token: 'abc',
      whmUser: 'root',
      nested: { password: 'p', authorization: 'whm root:x', ok: 1 },
      list: [{ apiKey: 'k', label: 'fine' }],
    });
    expect(out.token).toBe('[REDACTED]');
    expect(out.whmUser).toBe('root');
    expect(out.nested.password).toBe('[REDACTED]');
    expect(out.nested.authorization).toBe('[REDACTED]');
    expect(out.nested.ok).toBe(1);
    expect(out.list[0]!.apiKey).toBe('[REDACTED]');
    expect(out.list[0]!.label).toBe('fine');
  });

  it('lastFour keeps only the final four chars', () => {
    expect(lastFour('abcdef')).toBe('cdef');
    expect(lastFour('ab')).toBe('••••');
  });
});
