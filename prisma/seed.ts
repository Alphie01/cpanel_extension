/* Idempotent seed for the cpanel-whm-manager extension.
 * Seeds extension default settings only (servers/tokens are tenant-created).
 * Re-running must NOT create duplicates or clobber tenant overrides — every
 * write is an upsert keyed by a stable `key`, with an empty update clause.
 *
 * `seedDefaults` is pure (takes a minimal Prisma-shaped interface) so it can be
 * unit-tested without a live database; `main` wires the real PrismaClient. */

export interface DefaultSetting {
  key: string;
  value: string;
  description: string;
}

export const DEFAULT_SETTINGS: readonly DefaultSetting[] = [
  { key: 'default_whm_port', value: '2087', description: 'Default WHM (whostmgr) HTTPS port.' },
  { key: 'default_cpanel_port', value: '2083', description: 'Default cPanel HTTPS port.' },
  { key: 'default_deploy_path', value: '/public_html', description: 'Default SFTP deploy target path.' },
  { key: 'whm_verify_ssl', value: 'true', description: 'Default SSL verification for new servers.' },
  { key: 'sync_enabled', value: 'false', description: 'Whether the scheduled sync worker is active.' },
];

export interface SeedablePrisma {
  extHostingSetting: {
    upsert(args: {
      where: { key: string };
      update: Record<string, never>;
      create: { key: string; value: string; description: string };
    }): Promise<unknown>;
  };
}

export async function seedDefaults(prisma: SeedablePrisma): Promise<number> {
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.extHostingSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value, description: setting.description },
    });
  }
  return DEFAULT_SETTINGS.length;
}

async function main(): Promise<void> {
  // Lazy import so unit tests of seedDefaults don't require a generated client.
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const count = await seedDefaults(prisma as unknown as SeedablePrisma);
    console.log(`✓ Seeded ${count} default setting(s) (idempotent).`);
  } finally {
    await prisma.$disconnect();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
