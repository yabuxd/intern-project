import type {
  AdminDashboard,
  AdminUser,
  ApiResponse,
  AuthUser,
  CreateAdminUserInput,
  CreateOrderInput,
  CreateOrderResult,
  CreateReservationInput,
  MenuCategory,
  MenuChangeRequest,
  MenuItem,
  MenuItemInput,
  Order,
  OrderDriver,
  OrderReceipt,
  OrderStatus,
  PageMeta,
  PaymentDesk,
  PermissionName,
  PermissionRecord,
  Reservation,
  RestaurantTable,
  RoleRecord,
  StaffNotification,
  TableStatus,
} from '@intern/shared';
import { queryClient } from '../queryClient';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api';
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
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        ...rest,
        signal: rest.signal ?? AbortSignal.timeout(25_000),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        throw new ApiError('The API took too long to respond. Is php artisan serve running?', 0);
      }
      throw new ApiError(
        `Cannot reach the API at ${apiBaseUrl}. Start it with: cd server && php artisan serve`,
        0,
      );
    }

    const body = (await response.json().catch(() => null)) as
      | (ApiResponse<T> & { errors?: Record<string, string[] | string> })
      | null;

    if (!response.ok) {
      const fieldErrors = body?.errors
        ? Object.values(body.errors)
            .flatMap((value) => (Array.isArray(value) ? value : [value]))
            .filter(Boolean)
        : [];
      throw new ApiError(
        fieldErrors[0] ?? body?.message ?? `Request failed (${response.status})`,
        response.status,
      );
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

export async function uploadMenuImage(
  token: string,
  file: File,
): Promise<{ image_url: string }> {
  let response: Response;
  try {
    const body = new FormData();
    body.append('image', file);
    response = await fetch(`${apiBaseUrl}/menu-items/upload-image`, {
      method: 'POST',
      signal: AbortSignal.timeout(60_000),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
    });
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'TimeoutError' || name === 'AbortError') {
      throw new ApiError('Image upload timed out. Is php artisan serve running?', 0);
    }
    throw new ApiError(
      `Cannot reach the API at ${apiBaseUrl}. Start it with: cd server && php artisan serve`,
      0,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | (ApiResponse<{ image_url: string }> & { errors?: Record<string, string[] | string> })
    | null;

  if (!response.ok) {
    const fieldErrors = payload?.errors
      ? Object.values(payload.errors)
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .filter(Boolean)
      : [];
    throw new ApiError(
      fieldErrors[0] ?? payload?.message ?? `Upload failed (${response.status})`,
      response.status,
    );
  }

  return payload?.data ?? { image_url: '' };
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

export function updateTable(
  token: string,
  id: number,
  input: { name?: string; capacity?: number | null; status?: TableStatus },
): Promise<RestaurantTable> {
  return apiFetch<RestaurantTable>(`/tables/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(input),
  });
}

export function createTable(
  token: string,
  input: { name: string; capacity?: number | null; status?: TableStatus },
): Promise<RestaurantTable> {
  return apiFetch<RestaurantTable>('/tables', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function deleteTable(token: string, id: number): Promise<null> {
  return apiFetch<null>(`/tables/${id}`, {
    method: 'DELETE',
    token,
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

export async function createOrder(
  token: string,
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  const body = await requestJson<Order>('/orders', {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });

  const checkoutUrl =
    typeof (body as unknown as { checkout_url?: unknown }).checkout_url === 'string'
      ? (body as unknown as { checkout_url: string }).checkout_url
      : null;

  return {
    order: body.data,
    checkout_url: checkoutUrl,
  };
}

export function verifyOrderPayment(
  token: string,
  orderId: number,
  txRef?: string | null,
): Promise<Order> {
  const query = txRef
    ? `?trx_ref=${encodeURIComponent(txRef)}`
    : '';
  return apiFetch<Order>(`/orders/${orderId}/payment/verify${query}`, { token });
}

export function fetchOrderReceipt(token: string, orderId: number): Promise<OrderReceipt> {
  return apiFetch<OrderReceipt>(`/orders/${orderId}/receipt`, { token });
}

export function fetchPaymentDesk(token: string): Promise<PaymentDesk> {
  return apiFetch<PaymentDesk>('/payments/desk', { token });
}

export function approveCashierPayment(token: string, orderId: number): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/cashier/approve`, {
    method: 'POST',
    token,
  });
}

export function collectCashPayment(token: string, orderId: number): Promise<Order> {
  return apiFetch<Order>(`/orders/${orderId}/cashier/collect-cash`, {
    method: 'POST',
    token,
  });
}

export function fetchStaffNotifications(token: string): Promise<StaffNotification[]> {
  return apiFetch<StaffNotification[]>('/notifications', { token });
}

export function markStaffNotificationRead(
  token: string,
  notificationId: number,
): Promise<StaffNotification> {
  return apiFetch<StaffNotification>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
    token,
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

export function fetchAdminDashboard(
  token: string,
  range?: { from?: string; to?: string },
): Promise<AdminDashboard> {
  const params = new URLSearchParams();
  if (range?.from) params.set('from', range.from);
  if (range?.to) params.set('to', range.to);
  const query = params.toString();
  return apiFetch<AdminDashboard>(`/admin/dashboard${query ? `?${query}` : ''}`, { token });
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

export function deleteAdminUser(token: string, userId: string): Promise<null> {
  return apiFetch<null>(`/admin/users/${userId}`, {
    method: 'DELETE',
    token,
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

let prefetchTimer: ReturnType<typeof setTimeout> | null = null;

export function debouncePrefetch(fn: () => void, delayMs = 120): void {
  if (prefetchTimer) {
    clearTimeout(prefetchTimer);
  }
  prefetchTimer = setTimeout(() => {
    fn();
    prefetchTimer = null;
  }, delayMs);
}

export function cancelPrefetch(): void {
  if (prefetchTimer) {
    clearTimeout(prefetchTimer);
    prefetchTimer = null;
  }
}

export function prefetchMenu(): void {
  void queryClient.prefetchQuery({
    queryKey: ['menu'],
    queryFn: fetchMenu,
    staleTime: 60_000,
  });
}

export function prefetchTables(): void {
  void queryClient.prefetchQuery({
    queryKey: ['tables'],
    queryFn: fetchTables,
    staleTime: 15_000,
  });
}

export function prefetchAdminDashboard(
  token?: string | null,
  range?: { from?: string; to?: string },
): void {
  if (!token) return;
  void queryClient.prefetchQuery({
    queryKey: ['admin', 'dashboard', token, range?.from, range?.to],
    queryFn: () => fetchAdminDashboard(token, range),
    staleTime: 30_000,
  });
}

export function prefetchAdminRolesData(token?: string | null): void {
  if (!token) return;
  void queryClient.prefetchQuery({
    queryKey: ['admin', 'roles', token],
    queryFn: () => fetchAdminRoles(token),
    staleTime: 60_000,
  });
}

export function prefetchOrderQueue(token?: string | null): void {
  if (!token) return;
  void queryClient.prefetchQuery({
    queryKey: ['orders', 'queue', token],
    queryFn: () => fetchOrderQueue(token),
    staleTime: 10_000,
  });
}

export function prefetchDeliveriesData(token?: string | null): void {
  if (!token) return;
  void queryClient.prefetchQuery({
    queryKey: ['orders', 'deliveries', token],
    queryFn: () => fetchDeliveries(token),
    staleTime: 10_000,
  });
}

export function prefetchPaymentDeskData(token?: string | null): void {
  if (!token) return;
  void queryClient.prefetchQuery({
    queryKey: ['payments', 'desk', token],
    queryFn: () => fetchPaymentDesk(token),
    staleTime: 5_000,
  });
}

export function prefetchManageMenuData(token?: string | null): void {
  if (!token) return;
  void queryClient.prefetchQuery({
    queryKey: ['menu', 'manage', token],
    queryFn: () => fetchManageMenu(token),
    staleTime: 30_000,
  });
}

export function prefetchReservationsData(token?: string | null): void {
  if (!token) return;
  void queryClient.prefetchQuery({
    queryKey: ['reservations', token],
    queryFn: () => fetchReservations(token),
    staleTime: 15_000,
  });
}


