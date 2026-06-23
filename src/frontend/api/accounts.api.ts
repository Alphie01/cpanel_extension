import { api } from './client';
import type { AccountDto, AccountMetricsDto, Paginated } from '../types/api.types';

export interface AccountListParams {
  page?: number;
  serverId?: string;
  search?: string;
  suspended?: boolean;
}

export const accountsApi = {
  list: (params: AccountListParams = {}): Promise<Paginated<AccountDto>> => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.serverId) q.set('serverId', params.serverId);
    if (params.search) q.set('search', params.search);
    if (params.suspended !== undefined) q.set('suspended', String(params.suspended));
    const qs = q.toString();
    return api.get<Paginated<AccountDto>>(`/accounts${qs ? `?${qs}` : ''}`);
  },
  get: (id: string): Promise<AccountDto> => api.get<AccountDto>(`/accounts/${id}`),
  metrics: (id: string): Promise<AccountMetricsDto> =>
    api.get<AccountMetricsDto>(`/accounts/${id}/metrics`),
  refresh: (id: string): Promise<AccountDto> => api.post<AccountDto>(`/accounts/${id}/refresh`, {}),
  syncServer: (serverId: string): Promise<{ serverId: string; accounts: number }> =>
    api.post<{ serverId: string; accounts: number }>(`/servers/${serverId}/sync`, {}),
};
