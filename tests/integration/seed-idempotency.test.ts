import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, seedDefaults, type SeedablePrisma } from '../../prisma/seed';

class FakeSettingsStore {
  store = new Map<string, { key: string; value: string; description: string }>();

  async upsert(args: {
    where: { key: string };
    update: Record<string, never>;
    create: { key: string; value: string; description: string };
  }): Promise<unknown> {
    if (!this.store.has(args.where.key)) {
      this.store.set(args.where.key, args.create);
    }
    return this.store.get(args.where.key);
  }
}

describe('seed idempotency', () => {
  it('does not create duplicates when run twice', async () => {
    const settings = new FakeSettingsStore();
    const prisma: SeedablePrisma = { extHostingSetting: settings };

    await seedDefaults(prisma);
    await seedDefaults(prisma);

    expect(settings.store.size).toBe(DEFAULT_SETTINGS.length);
  });
});
