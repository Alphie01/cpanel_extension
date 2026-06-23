/* Tenant-aware migration runner. Wraps `prisma migrate deploy` (additive,
 * non-destructive). Two modes:
 *   npm run migrate -- --tenantId=<id>     (deploys against current DATABASE_URL)
 *   npm run migrate:all-assigned           (iterates EXT_ASSIGNED_TENANT_DSNS)
 * The platform injects the correct per-tenant DSN; this never runs destructive
 * operations and never targets all tenants implicitly. */
import { execFileSync } from 'node:child_process';

const SCHEMA = 'prisma/extension.prisma';

interface AssignedTenant {
  tenantId: string;
  databaseUrl: string;
}

function deploy(databaseUrl: string | undefined, tenantId: string): void {
  const env = { ...process.env };
  if (databaseUrl) env.DATABASE_URL = databaseUrl;
  console.log(`→ Migrating tenant ${tenantId}…`);
  execFileSync('npx', ['prisma', 'migrate', 'deploy', '--schema', SCHEMA], {
    stdio: 'inherit',
    env,
  });
}

function main(): void {
  const args = process.argv.slice(2);
  const allAssigned = args.includes('--all-assigned');
  const tenantArg = args.find((a) => a.startsWith('--tenantId='))?.split('=')[1];

  if (allAssigned) {
    const raw = process.env.EXT_ASSIGNED_TENANT_DSNS;
    if (!raw) {
      console.error('EXT_ASSIGNED_TENANT_DSNS is not set; cannot migrate all assigned tenants.');
      process.exit(1);
    }
    const tenants = JSON.parse(raw) as AssignedTenant[];
    for (const t of tenants) deploy(t.databaseUrl, t.tenantId);
    console.log(`✓ Migrated ${tenants.length} assigned tenant(s).`);
    return;
  }

  deploy(undefined, tenantArg ?? '(current DATABASE_URL)');
  console.log('✓ Migration complete.');
}

main();
