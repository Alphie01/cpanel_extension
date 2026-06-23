import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { serversApi } from '../api/servers.api';
import type { CreateServerInput, Paginated, ServerDto, TestConnectionResult, UpdateServerInput } from '../types/api.types';

const KEY = ['hosting', 'servers'] as const;

export function useServers(params: { page?: number; search?: string } = {}): UseQueryResult<Paginated<ServerDto>> {
  return useQuery({ queryKey: [...KEY, params], queryFn: () => serversApi.list(params) });
}

export function useServer(id: string | undefined): UseQueryResult<ServerDto> {
  return useQuery({ queryKey: ['hosting', 'server', id], queryFn: () => serversApi.get(id!), enabled: Boolean(id) });
}

export function useCreateServer(): UseMutationResult<ServerDto, unknown, CreateServerInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServerInput) => serversApi.create(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateServer(id: string): UseMutationResult<ServerDto, unknown, UpdateServerInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateServerInput) => serversApi.update(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEY });
      void qc.invalidateQueries({ queryKey: ['hosting', 'server', id] });
    },
  });
}

export function useDeleteServer(): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => serversApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useTestConnection(id: string): UseMutationResult<TestConnectionResult, unknown, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => serversApi.testConnection(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['hosting', 'server', id] }),
  });
}
