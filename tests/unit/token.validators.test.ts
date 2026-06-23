import { describe, expect, it } from 'vitest';
import { createTokenSchema, updateTokenSchema } from '../../src/shared/schemas/token.schema';

describe('token schemas', () => {
  it('accepts a valid WHM token', () => {
    const parsed = createTokenSchema.parse({
      label: 'Root WHM',
      whmUser: 'root',
      token: 'a-long-enough-token',
    });
    expect(parsed.scope).toBe('WHM');
  });

  it('rejects a too-short token', () => {
    expect(
      createTokenSchema.safeParse({ label: 'L', whmUser: 'root', token: 'short' }).success,
    ).toBe(false);
  });

  it('requires cpanelUser when scope is CPANEL', () => {
    const bad = createTokenSchema.safeParse({
      label: 'L',
      scope: 'CPANEL',
      whmUser: 'acct',
      token: 'a-long-enough-token',
    });
    expect(bad.success).toBe(false);
  });

  it('update schema rejects an empty patch', () => {
    expect(updateTokenSchema.safeParse({}).success).toBe(false);
  });

  it('update schema accepts an isActive toggle', () => {
    expect(updateTokenSchema.safeParse({ isActive: false }).success).toBe(true);
  });
});
