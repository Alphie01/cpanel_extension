/* Seeds extension default settings against the current DATABASE_URL. Idempotent
 * (delegates to prisma/seed.ts seedDefaults). */
import 'dotenv/config';
import { seedDefaults, type SeedablePrisma } from '../prisma/seed';

async function main(): Promise<void> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const count = await seedDefaults(prisma as unknown as SeedablePrisma);
    console.log(`✓ Seeded ${count} default setting(s) (idempotent).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
