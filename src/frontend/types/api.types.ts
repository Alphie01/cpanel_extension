/* Frontend re-exports of the shared API contracts. */
export type { ServerDto, ServerStatus, TestConnectionResult } from '../../shared/types/server.types';
export type { TokenDto, TokenScope } from '../../shared/types/token.types';
export type { AccountDto, AccountMetricsDto } from '../../shared/types/account.types';
export type {
  EmailAccountDto,
  CreateEmailAccountRequest,
  UpdateEmailAccountRequest,
} from '../../shared/types/email.types';
export type { DomainDto, DomainType } from '../../shared/types/domain.types';
export type { DatabaseDto, DatabaseUserDto, DatabasesOverview } from '../../shared/types/database.types';
export type { Paginated } from '../../shared/types/common.types';
export type { CreateServerInput, UpdateServerInput } from '../../shared/schemas/server.schema';
export type { CreateTokenInput, UpdateTokenInput } from '../../shared/schemas/token.schema';
