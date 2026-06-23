import { api } from './client';
import type { DatabasesOverview } from '../types/api.types';

export const databasesApi = {
  overview: (accountId: string): Promise<DatabasesOverview> =>
    api.get<DatabasesOverview>(`/accounts/${accountId}/databases`),
  createDatabase: (accountId: string, name: string): Promise<{ created: string }> =>
    api.post<{ created: string }>(`/accounts/${accountId}/databases`, { name }),
  createUser: (accountId: string, name: string, password: string): Promise<{ created: string }> =>
    api.post<{ created: string }>(`/accounts/${accountId}/database-users`, { name, password }),
  assignUser: (accountId: string, user: string, database: string): Promise<{ ok: boolean }> =>
    api.post<{ ok: boolean }>(`/accounts/${accountId}/database-assignments`, { user, database }),
  deleteDatabase: (accountId: string, name: string): Promise<void> =>
    api.del(`/accounts/${accountId}/databases/${encodeURIComponent(name)}?confirm=true`),
  deleteUser: (accountId: string, name: string): Promise<void> =>
    api.del(`/accounts/${accountId}/database-users/${encodeURIComponent(name)}`),
};
