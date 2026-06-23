import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { databasesApi } from '../api/databases.api';
import type { DatabasesOverview } from '../types/api.types';

export function useDatabases(accountId: string | undefined): UseQueryResult<DatabasesOverview> {
  return useQuery({
    queryKey: ['hosting', 'databases', accountId],
    queryFn: () => databasesApi.overview(accountId!),
    enabled: Boolean(accountId),
  });
}

function useInvalidate(accountId: string): () => void {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ['hosting', 'databases', accountId] });
}

export function useCreateDatabase(accountId: string): UseMutationResult<{ created: string }, unknown, string> {
  const invalidate = useInvalidate(accountId);
  return useMutation({ mutationFn: (name: string) => databasesApi.createDatabase(accountId, name), onSuccess: invalidate });
}

export function useCreateDatabaseUser(
  accountId: string,
): UseMutationResult<{ created: string }, unknown, { name: string; password: string }> {
  const invalidate = useInvalidate(accountId);
  return useMutation({
    mutationFn: ({ name, password }: { name: string; password: string }) =>
      databasesApi.createUser(accountId, name, password),
    onSuccess: invalidate,
  });
}

export function useDeleteDatabase(accountId: string): UseMutationResult<void, unknown, string> {
  const invalidate = useInvalidate(accountId);
  return useMutation({ mutationFn: (name: string) => databasesApi.deleteDatabase(accountId, name), onSuccess: invalidate });
}
