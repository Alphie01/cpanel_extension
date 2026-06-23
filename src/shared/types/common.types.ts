/* Cross-cutting types shared by backend and frontend. */
import type { ExtErrorCode } from '../constants/error-codes';

export interface ErrorEnvelope {
  error: {
    code: ExtErrorCode | string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationQuery {
  page: number;
  pageSize: number;
}
