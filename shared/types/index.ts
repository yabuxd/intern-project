/** Generic API envelope used by client/server contracts. */
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

/** Placeholder pagination metadata. */
export interface PaginatedMeta {
  page: number;
  perPage: number;
  total: number;
}
