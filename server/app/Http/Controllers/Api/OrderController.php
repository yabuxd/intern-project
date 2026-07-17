<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $orders = Order::query()
            ->with(['items.menuItem', 'table'])
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (Order $order) => $this->transform($order));

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function queue(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $orders = Order::query()
            ->with(['items.menuItem', 'table', 'user'])
            ->whereIn('status', [
                Order::STATUS_PENDING,
                Order::STATUS_PREPARING,
                Order::STATUS_READY,
            ])
            ->orderBy('created_at')
            ->limit(100)
            ->get()
            ->map(fn (Order $order) => $this->transform($order, includeUser: true));

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        $order = DB::transaction(function () use ($validated, $user) {
            $menuItemIds = collect($validated['items'])->pluck('menu_item_id')->unique()->all();
            $menuItems = MenuItem::query()
                ->whereIn('id', $menuItemIds)
                ->where('is_available', true)
                ->get()
                ->keyBy('id');

            if ($menuItems->count() !== count($menuItemIds)) {
                throw ValidationException::withMessages([
                    'items' => ['One or more menu items are unavailable.'],
                ]);
            }

            $order = Order::query()->create([
                'user_id' => $user->id,
                'table_id' => $validated['table_id'] ?? null,
                'status' => Order::STATUS_PENDING,
                'total' => 0,
            ]);

            $total = 0;

            foreach ($validated['items'] as $line) {
                $menuItem = $menuItems->get($line['menu_item_id']);
                $unitPrice = (float) $menuItem->price;
                $lineTotal = round($unitPrice * $line['quantity'], 2);

                OrderItem::query()->create([
                    'order_id' => $order->id,
                    'menu_item_id' => $menuItem->id,
                    'quantity' => $line['quantity'],
                    'unit_price' => $unitPrice,
                    'line_total' => $lineTotal,
                ]);

                $total += $lineTotal;
            }

            $order->update(['total' => round($total, 2)]);

            return $order->fresh(['items.menuItem', 'table']);
        });

        return response()->json([
            'success' => true,
            'data' => $this->transform($order),
            'message' => 'Order placed.',
        ], 201);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $nextStatus = $request->validated('status');

        if (! $order->canTransitionTo($nextStatus)) {
            throw ValidationException::withMessages([
                'status' => ["Cannot transition from {$order->status} to {$nextStatus}."],
            ]);
        }

        $order->update(['status' => $nextStatus]);
        $order->load(['items.menuItem', 'table']);

        return response()->json([
            'success' => true,
            'data' => $this->transform($order),
            'message' => 'Order status updated.',
        ]);
    }

    public function cancel(Request $request, Order $order): JsonResponse
    {
        $this->authorize('cancel', $order);

        if (! $order->canTransitionTo(Order::STATUS_CANCELLED)) {
            throw ValidationException::withMessages([
                'status' => ["Cannot cancel an order with status {$order->status}."],
            ]);
        }

        $order->update(['status' => Order::STATUS_CANCELLED]);
        $order->load(['items.menuItem', 'table']);

        return response()->json([
            'success' => true,
            'data' => $this->transform($order),
            'message' => 'Order cancelled.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Order $order, bool $includeUser = false): array
    {
        $payload = [
            'id' => $order->id,
            'user_id' => $order->user_id,
            'table_id' => $order->table_id,
            'status' => $order->status,
            'total' => $order->total,
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),
            'table' => $order->relationLoaded('table') && $order->table
                ? [
                    'id' => $order->table->id,
                    'name' => $order->table->name,
                ]
                : null,
            'items' => $order->relationLoaded('items')
                ? $order->items->map(fn (OrderItem $item) => [
                    'id' => $item->id,
                    'menu_item_id' => $item->menu_item_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'line_total' => $item->line_total,
                    'menu_item' => $item->relationLoaded('menuItem') && $item->menuItem
                        ? [
                            'id' => $item->menuItem->id,
                            'name' => $item->menuItem->name,
                        ]
                        : null,
                ])->values()->all()
                : [],
        ];

        if ($includeUser && $order->relationLoaded('user') && $order->user) {
            $payload['user'] = [
                'id' => $order->user->id,
                'name' => $order->user->name,
                'email' => $order->user->email,
            ];
        }

        return $payload;
    }
}
