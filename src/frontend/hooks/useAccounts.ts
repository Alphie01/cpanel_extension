import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { accountsApi, type AccountListParams } from '../api/accounts.api';
import type { AccountDto, AccountMetricsDto, Paginated } from '../types/api.types';

const KEY = ['hosting', 'accounts'] as const;

export function useAccounts(params: AccountListParams = {}): UseQueryResult<Paginated<AccountDto>> {
  return useQuery({ queryKey: [...KEY, params], queryFn: () => accountsApi.list(params) });
}

export function useAccount(id: string | undefined): UseQueryResult<AccountDto> {
  return useQuery({ queryKey: ['hosting', 'account', id], queryFn: () => accountsApi.get(id!), enabled: Boolean(id) });
}

export function useAccountMetrics(id: string | undefined): UseQueryResult<AccountMetricsDto> {
  return useQuery({
    queryKey: ['hosting', 'account-metrics', id],
    queryFn: () => accountsApi.metrics(id!),
    enabled: Boolean(id),
  });
}

export function useSyncServer(): UseMutationResult<{ serverId: string; accounts: number }, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serverId: string) => accountsApi.syncServer(serverId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}
