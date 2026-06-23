import { describe, expect, it } from 'vitest';
import {
  createServerSchema,
  listServersQuerySchema,
  updateServerSchema,
} from '../../src/shared/schemas/server.schema';

describe('server schemas', () => {
  it('applies defaults for port and verifySsl', () => {
    const parsed = createServerSchema.parse({ name: 'Prod', hostname: 'srv.example.com' });
    expect(parsed.port).toBe(2087);
    expect(parsed.verifySsl).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(createServerSchema.safeParse({ name: '', hostname: 'h' }).success).toBe(false);
  });

  it('rejects an out-of-range port', () => {
    expect(
      createServerSchema.safeParse({ name: 'P', hostname: 'h', port: 99999 }).success,
    ).toBe(false);
  });

  it('rejects a hostname with illegal characters', () => {
    expect(createServerSchema.safeParse({ name: 'P', hostname: 'bad host!' }).success).toBe(false);
  });

  it('update schema allows partial input', () => {
    expect(updateServerSchema.safeParse({ notes: 'updated' }).success).toBe(true);
  });

  it('list query coerces and defaults pagination', () => {
    const q = listServersQuerySchema.parse({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(20);
    expect(listServersQuerySchema.parse({ page: '3' }).page).toBe(3);
  });
});
