/* Audit helper. Every important action is recorded to ext_hosting_operation_logs
 * via an injected sink. Metadata is redacted before persistence so a secret can
 * never land in the audit table. Decoupled from Prisma/context via interfaces. */
import { redact } from './redact';

export interface AuditContext {
  tenantId: string;
  userId: string | null;
  requestId?: string;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string;
  status?: 'SUCCESS' | 'FAILURE';
  metadata?: Record<string, unknown>;
}

export interface AuditRecord {
  tenantId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  status: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

export interface AuditSink {
  record(entry: AuditRecord): Promise<void>;
}

export async function writeAudit(
  sink: AuditSink,
  ctx: AuditContext,
  entry: AuditEntry,
): Promise<void> {
  await sink.record({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    status: entry.status ?? 'SUCCESS',
    metadata: entry.metadata ? redact(entry.metadata) : undefined,
    requestId: ctx.requestId,
  });
}
