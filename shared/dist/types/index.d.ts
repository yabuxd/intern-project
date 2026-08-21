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
export declare const PERMISSIONS: {
    readonly CAN_MANAGE_MENU: "can_manage_menu";
    readonly CAN_VIEW_ALL_ORDERS: "can_view_all_orders";
    readonly CAN_UPDATE_ORDER_STATUS: "can_update_order_status";
    readonly CAN_MANAGE_TABLES: "can_manage_tables";
    readonly CAN_PLACE_ORDER: "can_place_order";
    readonly CAN_CREATE_RESERVATION: "can_create_reservation";
    readonly CAN_MANAGE_PERMISSIONS: "can_manage_permissions";
    readonly CAN_MANAGE_DELIVERIES: "can_manage_deliveries";
    readonly CAN_ACCEPT_DELIVERY_ORDERS: "can_accept_delivery_orders";
    readonly CAN_PROPOSE_MENU_CHANGES: "can_propose_menu_changes";
    readonly CAN_MANAGE_PAYMENTS: "can_manage_payments";
};
export type PermissionName = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export declare const ROLES: {
    readonly CUSTOMER: "customer";
    readonly KITCHEN: "kitchen";
    readonly HOST: "host";
    readonly MANAGER: "manager";
    readonly ADMIN: "admin";
    readonly DELIVERY: "delivery";
    readonly DRIVER: "delivery";
    readonly CASHIER: "cashier";
};
export type RoleName = (typeof ROLES)[keyof typeof ROLES] | "driver";
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
export type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "served" | "out_for_delivery" | "delivered" | "received" | "cancelled";
export type FulfillmentType = "dine_in" | "delivery";
export type PaymentMethod = "cash" | "chapa";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "not_required";
export interface OrderDriver {
    id: string;
    name: string | null;
    email: string;
}
export type DeliveryCourier = OrderDriver;
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
    payment_method: PaymentMethod;
    payment_status: PaymentStatus;
    payment_reference: string | null;
    paid_at: string | null;
    cashier_approved_at: string | null;
    cashier_approved_by: string | null;
    cash_collected_at: string | null;
    cash_collected_by: string | null;
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
    payment_method?: PaymentMethod;
}
export interface CreateOrderResult {
    order: Order;
    checkout_url?: string | null;
}
export type StaffNotificationType = "order_cash" | "order_chapa_paid";
export interface StaffNotification {
    id: number;
    order_id: number;
    type: StaffNotificationType;
    title: string;
    body: string;
    read_at: string | null;
    created_at: string | null;
}
export interface PaymentDesk {
    awaiting_chapa_validation: Order[];
    open_cash: Order[];
}
export interface OrderReceipt {
    receipt_number: string;
    issued_at: string;
    order: Order;
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
export type MenuChangeAction = "create" | "delete";
export type MenuChangeStatus = "pending" | "approved" | "rejected";
export interface MenuChangeRequest {
    id: number;
    action: MenuChangeAction;
    status: MenuChangeStatus;
    menu_item_id: number | null;
    payload: Partial<MenuItemInput> | null;
    review_note: string | null;
    created_at: string | null;
    reviewed_at: string | null;
    requester: {
        id: string;
        name: string | null;
        email: string;
    } | null;
    reviewer: {
        id: string;
        name: string | null;
        email: string;
    } | null;
    menu_item: {
        id: number;
        name: string;
    } | null;
}
export interface CreateAdminUserInput {
    name?: string;
    email: string;
    password: string;
    roles?: string[];
}
export interface AdminDashboardTopItem {
    menu_item_id: number;
    name: string;
    quantity_sold: number;
    revenue: string;
}
export interface AdminDashboard {
    range: {
        from: string;
        to: string;
    };
    orders: {
        total: number;
        by_status: Record<string, number>;
        by_fulfillment: Record<string, number>;
        cancelled: number;
        revenue_paid: string;
        aov: string;
    };
    payments: {
        by_method: Record<string, number>;
        by_status: Record<string, number>;
        awaiting_chapa_validation: number;
        open_cash: number;
    };
    deliveries: {
        active: number;
        unassigned: number;
        completed: number;
    };
    reservations: {
        confirmed: number;
        cancelled: number;
        upcoming: number;
    };
    menu: {
        available: number;
        unavailable: number;
        top_items: AdminDashboardTopItem[];
    };
    floor: {
        tables_by_status: Record<string, number>;
    };
    staff: {
        by_role: Record<string, number>;
        unread_notifications: number;
    };
    menu_change_requests: {
        pending: number;
    };
}
//# sourceMappingURL=index.d.ts.map