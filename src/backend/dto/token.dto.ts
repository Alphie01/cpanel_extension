/* Maps a token row to its public DTO. CRITICAL: tokenEnc / plaintext are NEVER
 * included — only `lastFour` is exposed as a display hint. */
import type { TokenDto } from '../../shared/types/token.types';
import type { TokenRow } from '../repositories/hosting-prisma';

export function toTokenDto(row: TokenRow): TokenDto {
  return {
    id: row.id,
    serverId: row.serverId,
    label: row.label,
    scope: row.scope,
    whmUser: row.whmUser,
    cpanelUser: row.cpanelUser,
    lastFour: row.lastFour,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
