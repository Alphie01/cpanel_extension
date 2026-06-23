import { api } from './client';
import type {
  CreateServerInput,
  Paginated,
  ServerDto,
  TestConnectionResult,
  UpdateServerInput,
} from '../types/api.types';

export const serversApi = {
  list: (params: { page?: number; pageSize?: number; search?: string } = {}): Promise<Paginated<ServerDto>> => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));
    if (params.search) q.set('search', params.search);
    const qs = q.toString();
    return api.get<Paginated<ServerDto>>(`/servers${qs ? `?${qs}` : ''}`);
  },
  get: (id: string): Promise<ServerDto> => api.get<ServerDto>(`/servers/${id}`),
  create: (input: CreateServerInput): Promise<ServerDto> => api.post<ServerDto>('/servers', input),
  update: (id: string, input: UpdateServerInput): Promise<ServerDto> =>
    api.patch<ServerDto>(`/servers/${id}`, input),
  remove: (id: string): Promise<void> => api.del(`/servers/${id}`),
  testConnection: (id: string): Promise<TestConnectionResult> =>
    api.post<TestConnectionResult>(`/servers/${id}/test-connection`, {}),
};
