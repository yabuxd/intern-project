import type {
  AdminUser,
  ApiResponse,
  AuthUser,
  CreateOrderInput,
  CreateReservationInput,
  MenuCategory,
  MenuItem,
  MenuItemInput,
  Order,
  OrderStatus,
  PermissionName,
  PermissionRecord,
  Reservation,
  RestaurantTable,
  TableStatus,
} from '@intern/shared';

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
  const { token, headers, body, ...rest } = options;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    body,
    headers: {
      Accept: 'application/json',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const responseBody = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok) {
    throw new ApiError(
      responseBody?.message ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  if (responseBody && typeof responseBody === 'object' && 'data' in responseBody) {
    return responseBody.data;
  }

  return responseBody as T;
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

function buildMenuItemFormData(
  input: Partial<MenuItemInput> & { image?: File | null },
  methodOverride?: 'PUT',
): FormData {
  const formData = new FormData();
  if (methodOverride) {
    formData.append('_method', methodOverride);
  }
  if (input.menu_category_id !== undefined) {
    formData.append('menu_category_id', String(input.menu_category_id));
  }
  if (input.name !== undefined) {
    formData.append('name', input.name);
  }
  if (input.description !== undefined) {
    formData.append('description', input.description ?? '');
  }
  if (input.image_url !== undefined && input.image_url !== null && input.image_url !== '') {
    formData.append('image_url', input.image_url);
  }
  if (input.price !== undefined) {
    formData.append('price', String(input.price));
  }
  if (input.is_available !== undefined) {
    formData.append('is_available', input.is_available ? '1' : '0');
  }
  if (input.sort_order !== undefined) {
    formData.append('sort_order', String(input.sort_order));
  }
  if (input.image) {
    formData.append('image', input.image);
  }
  return formData;
}

export function createMenuItem(
  token: string,
  input: MenuItemInput & { image?: File | null },
): Promise<MenuItem> {
  if (input.image) {
    return apiFetch<MenuItem>('/menu-items', {
      method: 'POST',
      token,
      body: buildMenuItemFormData(input),
    });
  }

  const { image: _image, ...jsonInput } = input;
  return apiFetch<MenuItem>('/menu-items', {
    method: 'POST',
    token,
    body: JSON.stringify(jsonInput),
  });
}

export function updateMenuItem(
  token: string,
  id: number,
  input: Partial<MenuItemInput> & { image?: File | null },
): Promise<MenuItem> {
  if (input.image) {
    // PHP only populates uploaded files on POST — spoof PUT for Laravel.
    return apiFetch<MenuItem>(`/menu-items/${id}`, {
      method: 'POST',
      token,
      body: buildMenuItemFormData(input, 'PUT'),
    });
  }

  const { image: _image, ...jsonInput } = input;
  return apiFetch<MenuItem>(`/menu-items/${id}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(jsonInput),
  });
}

export function deleteMenuItem(token: string, id: number): Promise<null> {
  return apiFetch<null>(`/menu-items/${id}`, {
    method: 'DELETE',
    token,
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

export function fetchOrders(token: string): Promise<Order[]> {
  return apiFetch<Order[]>('/orders', { token });
}

export function fetchOrderQueue(token: string): Promise<Order[]> {
  return apiFetch<Order[]>('/orders/queue', { token });
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

export function fetchPermissionCatalog(token: string): Promise<PermissionRecord[]> {
  return apiFetch<PermissionRecord[]>('/admin/permissions', { token });
}

export function updateUserPermissions(
  token: string,
  userId: string,
  permissions: PermissionName[],
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/admin/users/${userId}/permissions`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ permissions }),
  });
}
