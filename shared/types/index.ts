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

/** Authenticated user returned by GET /api/me */
export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  permissions: string[];
}

export const PERMISSIONS = {
  CAN_MANAGE_MENU: "can_manage_menu",
  CAN_VIEW_ALL_ORDERS: "can_view_all_orders",
  CAN_UPDATE_ORDER_STATUS: "can_update_order_status",
  CAN_MANAGE_TABLES: "can_manage_tables",
  CAN_PLACE_ORDER: "can_place_order",
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface MenuItem {
  id: number;
  menu_category_id: number;
  name: string;
  description: string | null;
  price: string | number;
  is_available: boolean;
  sort_order: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

export interface MenuCategory {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  items: MenuItem[];
}

export interface MenuItemInput {
  menu_category_id: number;
  name: string;
  description?: string | null;
  price: number;
  is_available?: boolean;
  sort_order?: number;
}
