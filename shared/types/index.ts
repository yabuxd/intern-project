export interface PageMeta {
  next_cursor: number | string | null;
  has_more: boolean;
}

/** Generic API envelope used by client/server contracts. */
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  meta?: PageMeta;
}

/** Authenticated user returned by GET /api/me */
export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  roles: string[];
  permissions: string[];
}

export const PERMISSIONS = {
  CAN_MANAGE_MENU: "can_manage_menu",
  CAN_VIEW_ALL_ORDERS: "can_view_all_orders",
  CAN_UPDATE_ORDER_STATUS: "can_update_order_status",
  CAN_MANAGE_TABLES: "can_manage_tables",
  CAN_PLACE_ORDER: "can_place_order",
  CAN_CREATE_RESERVATION: "can_create_reservation",
  CAN_MANAGE_PERMISSIONS: "can_manage_permissions",
  CAN_MANAGE_DELIVERIES: "can_manage_deliveries",
} as const;

export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLES = {
  CUSTOMER: "customer",
  KITCHEN: "kitchen",
  HOST: "host",
  MANAGER: "manager",
  ADMIN: "admin",
  DRIVER: "driver",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export interface MenuItem {
  id: number;
  menu_category_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
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
  image_url?: string | null;
  price: number;
  is_available?: boolean;
  sort_order?: number;
}

export type TableStatus = "free" | "reserved" | "occupied";

export interface RestaurantTable {
  id: number;
  name: string;
  capacity: number | null;
  status: TableStatus;
}

export type OrderStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "served"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type FulfillmentType = "dine_in" | "delivery";

export interface OrderDriver {
  id: string;
  name: string | null;
  email: string;
}

export interface OrderItem {
  id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: string | number;
  line_total: string | number;
  menu_item?: {
    id: number;
    name: string;
  } | null;
}

export interface Order {
  id: number;
  user_id: string;
  table_id: number | null;
  fulfillment_type: FulfillmentType;
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_notes: string | null;
  driver_id: string | null;
  status: OrderStatus;
  total: string | number;
  created_at: string | null;
  updated_at: string | null;
  table?: {
    id: number;
    name: string;
  } | null;
  driver?: OrderDriver | null;
  items: OrderItem[];
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface OrderLineInput {
  menu_item_id: number;
  quantity: number;
}

export interface CreateOrderInput {
  items: OrderLineInput[];
  table_id?: number | null;
  fulfillment_type?: FulfillmentType;
  delivery_address?: string | null;
  delivery_phone?: string | null;
  delivery_notes?: string | null;
}

export type ReservationStatus = "confirmed" | "cancelled";

export interface Reservation {
  id: number;
  user_id: string;
  table_id: number;
  party_size: number;
  starts_at: string;
  ends_at: string;
  status: ReservationStatus;
  notes: string | null;
  created_at: string | null;
  table?: {
    id: number;
    name: string;
    capacity: number | null;
  } | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface CreateReservationInput {
  table_id: number;
  party_size: number;
  starts_at: string;
  ends_at?: string;
  notes?: string | null;
}

export interface PermissionRecord {
  id: number;
  name: PermissionName;
  description: string | null;
}

export interface RoleRecord {
  id: number;
  name: RoleName | string;
  description: string | null;
  permissions: PermissionName[];
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  roles: string[];
  permissions: PermissionName[];
}
