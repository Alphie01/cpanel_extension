/* Maps a server row to its public DTO. The DTO intentionally omits internal
 * columns (tenantId, createdById, deletedAt) — only safe, display fields. */
import type { ServerDto } from '../../shared/types/server.types';
import type { ServerRow } from '../repositories/hosting-prisma';

export function toServerDto(row: ServerRow, tokenCount: number): ServerDto {
  return {
    id: row.id,
    name: row.name,
    hostname: row.hostname,
    port: row.port,
    status: row.status,
    verifySsl: row.verifySsl,
    lastCheckedAt: row.lastCheckedAt ? row.lastCheckedAt.toISOString() : null,
    lastError: row.lastError,
    notes: row.notes,
    tokenCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
