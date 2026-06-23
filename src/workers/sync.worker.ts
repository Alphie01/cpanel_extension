/* Scheduled per-tenant sync worker (manifest job: hosting-control-sync).
 * The platform invokes this for an ASSIGNED tenant only, passing its id/run id.
 * Builds a container and syncs every server's accounts into the tenant cache
 * (idempotent upserts), updating server status and writing operation logs. */
import 'dotenv/config';
import { createContainer } from '../backend/index';
import type { SyncSummary } from '../backend/services/hosting-sync.service';

export interface SyncJobContext {
  tenantId: string;
  jobRunId: string;
}

export async function runSync(ctx: SyncJobContext): Promise<SyncSummary> {
  if (!ctx.tenantId) {
    throw new Error('Sync requires a tenantId (the assigned tenant).');
  }
  const deps = createContainer();
  try {
    const summary = await deps.syncTenant(ctx.tenantId);
    deps.logger.info('Worker sync finished', {
      tenantId: ctx.tenantId,
      jobRunId: ctx.jobRunId,
      operation: 'sync.worker',
      status: 'SUCCESS',
      ...summary,
    });
    return summary;
  } finally {
    await deps.dispose();
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  const ctx: SyncJobContext = {
    tenantId: process.env.EXT_TENANT_ID ?? '',
    jobRunId: process.env.EXT_JOB_RUN_ID ?? '',
  };
  runSync(ctx)
    .then((summary) => {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(summary));
      process.exit(0);
    })
    .catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
}
