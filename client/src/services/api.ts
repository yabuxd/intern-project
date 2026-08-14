import type {
  AdminUser,
  ApiResponse,
  AuthUser,
  CreateAdminUserInput,
  CreateOrderInput,
  CreateReservationInput,
  MenuCategory,
  MenuChangeRequest,
  MenuItem,
  MenuItemInput,
  Order,
  OrderDriver,
  OrderStatus,
  PageMeta,
  PermissionName,
  PermissionRecord,
  Reservation,
  RestaurantTable,
  RoleRecord,
  TableStatus,
} from '@intern/shared';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
const inflightGets = new Map<string, Promise<unknown>>();

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function requestJson<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<ApiResponse<T>> {
  const { token, headers, ...rest } = options;
  const method = (rest.method ?? 'GET').toUpperCase();
  const getKey = method === 'GET' ? `${path}:${token ?? ''}` : null;

  if (getKey) {
    const pending = inflightGets.get(getKey);
    if (pending) {
      return pending as Promise<ApiResponse<T>>;
    }
  }

  const request = (async () => {
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

    return (body ?? { success: true, data: null as T }) as ApiResponse<T>;
  })();

  if (getKey) {
    inflightGets.set(getKey, request);
    void request.finally(() => inflightGets.delete(getKey));
  }

  return request;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const body = await requestJson<T>(path, options);
  return body.data;
}

export async function apiFetchPage<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<{ data: T; meta?: PageMeta }> {
  const body = await requestJson<T>(path, options);
  return { data: body.data, meta: body.meta };
}

export function fetchMe(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>('/me', { token });
}

export function fetchMenu(): Promise<MenuCategory[]> {
  return apiFetch<MenuCategory[]>('/menu');
}

export function fetchManageMenu(token: string): Promise<MenuCategory[]> {
  return apiFetch<MenuCategory[]>('/menu/manage', { token });
}

export function createMenuItem(token: string, input: MenuItemInput): Promise<MenuItem> {
  return apiFetch<MenuItem>('/menu-items', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function updateMenuItem(
  token: string,
  id: number,
  input: Partial<MenuItemInput>,
): Promise<MenuItem> {
  return apiFetch<MenuItem>(`/menu-items/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(input),
  });
}

export function deleteMenuItem(token: string, id: number): Promise<null> {
  return apiFetch<null>(`/menu-items/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function fetchMenuChangeRequests(
  token: string,
  status?: string,
): Promise<MenuChangeRequest[]> {
  const query = status ? `?status=${status}` : '';
  return apiFetch<MenuChangeRequest[]>(`/menu-change-requests${query}`, { token });
}

export function createMenuChangeRequest(
  token: string,
  input: Record<string, unknown>,
): Promise<MenuChangeRequest> {
  return apiFetch<MenuChangeRequest>('/menu-change-requests', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function approveMenuChangeRequest(
  token: string,
  id: number,
): Promise<MenuChangeRequest> {
  return apiFetch<MenuChangeRequest>(`/menu-change-requests/${id}/approve`, {
    method: 'PATCH',
    token,
  });
}

export function rejectMenuChangeRequest(
  token: string,
  id: number,
  reviewNote?: string,
): Promise<MenuChangeRequest> {
  return apiFetch<MenuChangeRequest>(`/menu-change-requests/${id}/reject`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ review_note: reviewNote ?? null }),
  });
}

export function fetchTables(): Promise<RestaurantTable[]> {
  return apiFetch<RestaurantTable[]>('/tables');
}

export function updateTableStatus(
  token: string,
  id: number,
  status: TableStatus,
): Promise<RestaurantTable> {
  return apiFetch<RestaurantTable>(`/tables/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
}

export function fetchOrders(token: string, afterId?: number): Promise<Order[]> {
  const query = afterId ? `?after_id=${afterId}` : '';
  return apiFetch<Order[]>(`/orders${query}`, { token });
}

export function fetchOrdersPage(
  token: string,
  afterId?: number,
): Promise<{ data: Order[]; meta?: PageMeta }> {
  const query = afterId ? `?after_id=${afterId}` : '';
  return apiFetchPage<Order[]>(`/orders${query}`, { token });
}

export function fetchOrderQueue(token: string): Promise<Order[]> {
  return apiFetch<Order[]>('/orders/queue', { token });
}

export function fetchDeliveries(token: string): Promise<Order[]> {
  return apiFetch<Order[]>('/deliveries', { token });
}

export function fetchDeliveryDrivers(token: string): Promise<OrderDriver[]> {
  return apiFetch<OrderDriver[]>('/deliveries/drivers', { token });
}

export function assignOrderDriver(
  token: string,
  orderId: number,
  driverId: string,
): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/driver`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ driver_id: driverId }),
  });
}

export function createOrder(token: string, input: CreateOrderInput): Promise<Order> {
  return apiFetch<Order>('/orders', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function updateOrderStatus(
  token: string,
  orderId: number,
  status: OrderStatus,
): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
}

export function cancelOrder(token: string, orderId: number): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}`, {
    method: 'DELETE',
    token,
  });
}

export function fetchReservations(token: string): Promise<Reservation[]> {
  return apiFetch<Reservation[]>('/reservations', { token });
}

export function createReservation(
  token: string,
  input: CreateReservationInput,
): Promise<Reservation> {
  return apiFetch<Reservation>('/reservations', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function cancelReservation(token: string, id: number): Promise<Reservation> {
  return apiFetch<Reservation>(`/reservations/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function fetchAdminUsers(token: string): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/admin/users', { token });
}

export function createAdminUser(token: string, input: CreateAdminUserInput): Promise<AdminUser> {
  return apiFetch<AdminUser>('/admin/users', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function fetchPermissionCatalog(token: string): Promise<PermissionRecord[]> {
  return apiFetch<PermissionRecord[]>('/admin/permissions', { token });
}

export function fetchAdminRoles(token: string): Promise<RoleRecord[]> {
  return apiFetch<RoleRecord[]>('/admin/roles', { token });
}

export function updateUserRoles(
  token: string,
  userId: string,
  roles: string[],
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${userId}/roles`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ roles }),
  });
}

export function updateRolePermissions(
  token: string,
  roleId: number,
  permissions: PermissionName[],
): Promise<RoleRecord> {
  return apiFetch<RoleRecord>(`/admin/roles/${roleId}/permissions`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ permissions }),
  });
}
