import type { ApiResponse, AuthUser } from '@intern/shared';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    throw new ApiError(body?.message ?? `Request failed (${response.status})`, response.status);
  }

  if (body && typeof body === 'object' && 'data' in body) {
    return body.data;
  }

  return body as T;
}

export function fetchMe(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>('/me', { token });
}
