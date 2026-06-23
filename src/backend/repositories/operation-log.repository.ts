/* Audit sink backed by ext_hosting_operation_logs. Implements AuditSink so the
 * audit helper stays decoupled from Prisma. Metadata is already redacted by the
 * helper before it reaches here. */
import type { AuditRecord, AuditSink } from '../utils/audit';
import type { HostingPrismaClient } from './hosting-prisma';

export class PrismaOperationLogRepository implements AuditSink {
  constructor(private readonly prisma: HostingPrismaClient) {}

  async record(entry: AuditRecord): Promise<void> {
    await this.prisma.extHostingOperationLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        status: entry.status,
        metadata: entry.metadata ?? undefined,
        requestId: entry.requestId ?? null,
      },
    });
  }
}
