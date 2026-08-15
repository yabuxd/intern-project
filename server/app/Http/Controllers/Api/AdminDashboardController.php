<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuChangeRequest;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Permission;
use App\Models\Reservation;
use App\Models\RestaurantTable;
use App\Models\Role;
use App\Models\StaffNotification;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
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

        $ordersInRange = Order::query()
            ->whereBetween('created_at', [$from, $to]);

        $totalOrders = (clone $ordersInRange)->count();
        $cancelled = (clone $ordersInRange)->where('status', Order::STATUS_CANCELLED)->count();

        $byStatus = (clone $ordersInRange)
            ->select('status', DB::raw('count(*) as aggregate'))
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($count) => (int) $count)
            ->all();

        $byFulfillment = (clone $ordersInRange)
            ->select('fulfillment_type', DB::raw('count(*) as aggregate'))
            ->groupBy('fulfillment_type')
            ->pluck('aggregate', 'fulfillment_type')
            ->map(fn ($count) => (int) $count)
            ->all();

        $paidOrders = (clone $ordersInRange)->where('payment_status', Order::PAYMENT_PAID);
        $paidCount = (clone $paidOrders)->count();
        $revenuePaid = (float) (clone $paidOrders)->sum('total');
        $aov = $paidCount > 0 ? round($revenuePaid / $paidCount, 2) : 0.0;

        $paymentByMethod = (clone $ordersInRange)
            ->select('payment_method', DB::raw('count(*) as aggregate'))
            ->groupBy('payment_method')
            ->pluck('aggregate', 'payment_method')
            ->map(fn ($count) => (int) $count)
            ->all();

        $paymentByStatus = (clone $ordersInRange)
            ->select('payment_status', DB::raw('count(*) as aggregate'))
            ->groupBy('payment_status')
            ->pluck('aggregate', 'payment_status')
            ->map(fn ($count) => (int) $count)
            ->all();

        $awaitingChapa = Order::query()
            ->where('payment_method', Order::PAYMENT_METHOD_CHAPA)
            ->where('payment_status', Order::PAYMENT_PAID)
            ->whereNull('cashier_approved_at')
            ->count();

        $openCash = Order::query()
            ->where('payment_method', Order::PAYMENT_METHOD_CASH)
            ->where('payment_status', Order::PAYMENT_NOT_REQUIRED)
            ->whereNull('cash_collected_at')
            ->whereNotIn('status', [Order::STATUS_CANCELLED])
            ->count();

        $deliveryBase = Order::query()
            ->where('fulfillment_type', 'delivery')
            ->whereBetween('created_at', [$from, $to]);

        $deliveriesActive = (clone $deliveryBase)
            ->whereIn('status', [
                Order::STATUS_PENDING,
                Order::STATUS_ACCEPTED,
                Order::STATUS_PREPARING,
                Order::STATUS_READY,
                Order::STATUS_OUT_FOR_DELIVERY,
            ])
            ->count();

        $deliveriesUnassigned = (clone $deliveryBase)
            ->whereNull('driver_id')
            ->whereNotIn('status', [Order::STATUS_CANCELLED, Order::STATUS_RECEIVED, Order::STATUS_DELIVERED])
            ->count();

        $deliveriesCompleted = (clone $deliveryBase)
            ->whereIn('status', [Order::STATUS_DELIVERED, Order::STATUS_RECEIVED])
            ->count();

        $reservationsConfirmed = Reservation::query()
            ->where('status', Reservation::STATUS_CONFIRMED)
            ->whereBetween('starts_at', [$from, $to])
            ->count();

        $reservationsCancelled = Reservation::query()
            ->where('status', Reservation::STATUS_CANCELLED)
            ->whereBetween('starts_at', [$from, $to])
            ->count();

        $reservationsUpcoming = Reservation::query()
            ->where('status', Reservation::STATUS_CONFIRMED)
            ->where('starts_at', '>=', now())
            ->count();

        $menuAvailable = MenuItem::query()->where('is_available', true)->count();
        $menuUnavailable = MenuItem::query()->where('is_available', false)->count();

        $topItems = OrderItem::query()
            ->select(
                'menu_item_id',
                DB::raw('sum(quantity) as quantity_sold'),
                DB::raw('sum(line_total) as revenue'),
            )
            ->whereHas('order', function ($query) use ($from, $to) {
                $query->whereBetween('created_at', [$from, $to])
                    ->where('status', '!=', Order::STATUS_CANCELLED);
            })
            ->groupBy('menu_item_id')
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

        return response()->json([
            'success' => true,
            'data' => [
                'range' => [
                    'from' => $from->toIso8601String(),
                    'to' => $to->toIso8601String(),
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
                    'awaiting_chapa_validation' => $awaitingChapa,
                    'open_cash' => $openCash,
                ],
                'deliveries' => [
                    'active' => $deliveriesActive,
                    'unassigned' => $deliveriesUnassigned,
                    'completed' => $deliveriesCompleted,
                ],
                'reservations' => [
                    'confirmed' => $reservationsConfirmed,
                    'cancelled' => $reservationsCancelled,
                    'upcoming' => $reservationsUpcoming,
                ],
                'menu' => [
                    'available' => $menuAvailable,
                    'unavailable' => $menuUnavailable,
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
            ],
        ]);
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
