<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuChangeRequest;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Permission;
use App\Models\RestaurantTable;
use App\Models\Role;
use App\Models\StaffNotification;
use App\Services\ApiCacheService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function __construct(
        private readonly ApiCacheService $cache,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can(Permission::CAN_MANAGE_PERMISSIONS), 403);

        $to = $this->parseDate($request->query('to'), now()->endOfDay());
        $from = $this->parseDate(
            $request->query('from'),
            $to->copy()->subDays(6)->startOfDay(),
        );

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $fromIso = $from->toIso8601String();
        $toIso = $to->toIso8601String();

        $data = $this->cache->rememberAdminDashboard($fromIso, $toIso, function () use ($from, $to, $fromIso, $toIso) {
            $orderStats = DB::table('orders')
                ->whereBetween('created_at', [$from, $to])
                ->selectRaw("
                    count(*) as total_orders,
                    count(case when status = 'cancelled' then 1 end) as cancelled,
                    count(case when payment_status = 'paid' then 1 end) as paid_count,
                    coalesce(sum(case when payment_status = 'paid' then total else 0 end), 0) as revenue_paid,
                    count(case when fulfillment_type = 'delivery' and status in ('pending', 'accepted', 'preparing', 'ready', 'out_for_delivery') then 1 end) as delivery_active,
                    count(case when fulfillment_type = 'delivery' and driver_id is null and status not in ('cancelled', 'received', 'delivered') then 1 end) as delivery_unassigned,
                    count(case when fulfillment_type = 'delivery' and status in ('delivered', 'received') then 1 end) as delivery_completed
                ")
                ->first();

            $totalOrders = (int) ($orderStats?->total_orders ?? 0);
            $cancelled = (int) ($orderStats?->cancelled ?? 0);
            $paidCount = (int) ($orderStats?->paid_count ?? 0);
            $revenuePaid = (float) ($orderStats?->revenue_paid ?? 0);
            $aov = $paidCount > 0 ? round($revenuePaid / $paidCount, 2) : 0.0;
            $deliveryActive = (int) ($orderStats?->delivery_active ?? 0);
            $deliveryUnassigned = (int) ($orderStats?->delivery_unassigned ?? 0);
            $deliveryCompleted = (int) ($orderStats?->delivery_completed ?? 0);

            $byStatus = Order::query()
                ->whereBetween('created_at', [$from, $to])
                ->select('status', DB::raw('count(*) as aggregate'))
                ->groupBy('status')
                ->pluck('aggregate', 'status')
                ->map(fn ($count) => (int) $count)
                ->all();

            $byFulfillment = Order::query()
                ->whereBetween('created_at', [$from, $to])
                ->select('fulfillment_type', DB::raw('count(*) as aggregate'))
                ->groupBy('fulfillment_type')
                ->pluck('aggregate', 'fulfillment_type')
                ->map(fn ($count) => (int) $count)
                ->all();

            $paymentByMethod = Order::query()
                ->whereBetween('created_at', [$from, $to])
                ->select('payment_method', DB::raw('count(*) as aggregate'))
                ->groupBy('payment_method')
                ->pluck('aggregate', 'payment_method')
                ->map(fn ($count) => (int) $count)
                ->all();

            $paymentByStatus = Order::query()
                ->whereBetween('created_at', [$from, $to])
                ->select('payment_status', DB::raw('count(*) as aggregate'))
                ->groupBy('payment_status')
                ->pluck('aggregate', 'payment_status')
                ->map(fn ($count) => (int) $count)
                ->all();

            $paymentDeskStats = DB::table('orders')
                ->selectRaw("
                    count(case when payment_method = 'chapa' and payment_status = 'paid' and cashier_approved_at is null then 1 end) as awaiting_chapa,
                    count(case when payment_method = 'cash' and payment_status = 'not_required' and cash_collected_at is null and status != 'cancelled' then 1 end) as open_cash
                ")
                ->first();

            $reservationStats = DB::table('reservations')
                ->selectRaw("
                    count(case when status = 'confirmed' and starts_at between ? and ? then 1 end) as confirmed,
                    count(case when status = 'cancelled' and starts_at between ? and ? then 1 end) as cancelled,
                    count(case when status = 'confirmed' and starts_at >= ? then 1 end) as upcoming
                ", [$from, $to, $from, $to, now()])
                ->first();

            $menuStats = DB::table('menu_items')
                ->selectRaw("
                    count(case when is_available is true then 1 end) as available,
                    count(case when is_available is not true then 1 end) as unavailable
                ")
                ->first();

            $topItems = OrderItem::query()
                ->join('orders', 'orders.id', '=', 'order_items.order_id')
                ->whereBetween('orders.created_at', [$from, $to])
                ->where('orders.status', '!=', Order::STATUS_CANCELLED)
                ->select(
                    'order_items.menu_item_id',
                    DB::raw('sum(order_items.quantity) as quantity_sold'),
                    DB::raw('sum(order_items.line_total) as revenue'),
                )
                ->groupBy('order_items.menu_item_id')
                ->orderByDesc('quantity_sold')
                ->limit(8)
                ->get();

            $menuNames = MenuItem::query()
                ->whereIn('id', $topItems->pluck('menu_item_id'))
                ->pluck('name', 'id');

            $topSellers = $topItems->map(fn ($row) => [
                'menu_item_id' => (int) $row->menu_item_id,
                'name' => $menuNames[$row->menu_item_id] ?? 'Item #'.$row->menu_item_id,
                'quantity_sold' => (int) $row->quantity_sold,
                'revenue' => number_format((float) $row->revenue, 2, '.', ''),
            ])->values()->all();

            $tablesByStatus = RestaurantTable::query()
                ->select('status', DB::raw('count(*) as aggregate'))
                ->groupBy('status')
                ->pluck('aggregate', 'status')
                ->map(fn ($count) => (int) $count)
                ->all();

            $staffByRole = Role::query()
                ->withCount('users')
                ->get()
                ->mapWithKeys(fn (Role $role) => [$role->name => (int) $role->users_count])
                ->all();

            $unreadNotifications = StaffNotification::query()
                ->whereNull('read_at')
                ->count();

            $pendingMenuChanges = MenuChangeRequest::query()
                ->where('status', MenuChangeRequest::STATUS_PENDING)
                ->count();

            return [
                'range' => [
                    'from' => $fromIso,
                    'to' => $toIso,
                ],
                'orders' => [
                    'total' => $totalOrders,
                    'by_status' => $byStatus,
                    'by_fulfillment' => $byFulfillment,
                    'cancelled' => $cancelled,
                    'revenue_paid' => number_format($revenuePaid, 2, '.', ''),
                    'aov' => number_format($aov, 2, '.', ''),
                ],
                'payments' => [
                    'by_method' => $paymentByMethod,
                    'by_status' => $paymentByStatus,
                    'awaiting_chapa_validation' => (int) ($paymentDeskStats?->awaiting_chapa ?? 0),
                    'open_cash' => (int) ($paymentDeskStats?->open_cash ?? 0),
                ],
                'deliveries' => [
                    'active' => $deliveryActive,
                    'unassigned' => $deliveryUnassigned,
                    'completed' => $deliveryCompleted,
                ],
                'reservations' => [
                    'confirmed' => (int) ($reservationStats?->confirmed ?? 0),
                    'cancelled' => (int) ($reservationStats?->cancelled ?? 0),
                    'upcoming' => (int) ($reservationStats?->upcoming ?? 0),
                ],
                'menu' => [
                    'available' => (int) ($menuStats?->available ?? 0),
                    'unavailable' => (int) ($menuStats?->unavailable ?? 0),
                    'top_items' => $topSellers,
                ],
                'floor' => [
                    'tables_by_status' => $tablesByStatus,
                ],
                'staff' => [
                    'by_role' => $staffByRole,
                    'unread_notifications' => $unreadNotifications,
                ],
                'menu_change_requests' => [
                    'pending' => $pendingMenuChanges,
                ],
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('Cache-Control', 'private, max-age=15');
    }

    private function parseDate(mixed $value, Carbon $fallback): Carbon
    {
        if (! is_string($value) || trim($value) === '') {
            return $fallback;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return $fallback;
        }
    }
}
