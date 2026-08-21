<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AssignOrderDriverRequest;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\ApiCacheService;
use App\Services\ChapaPaymentService;
use App\Services\StaffNotificationService;
use App\Support\KeysetPaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class OrderController extends Controller
{
    public function __construct(
        private readonly ChapaPaymentService $chapa,
        private readonly StaffNotificationService $notifications,
        private readonly ApiCacheService $cache,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Order::query()
            ->selectApi()
            ->withApiRelations()
            ->where('user_id', $user->id);

        [$orders, $meta] = KeysetPaginator::paginate($query, $request, 'id', 'desc');

        return response()->json([
            'success' => true,
            'data' => $orders->map(fn (Order $order) => $this->transform($order))->values(),
            'meta' => $meta,
        ]);
    }

    public function queue(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Order::class);

        $query = Order::query()
            ->selectApi()
            ->withApiRelations(includeUser: true)
            ->paymentSettled()
            ->where(function ($builder) {
                $builder
                    ->where(function ($dineIn) {
                        $dineIn
                            ->where('fulfillment_type', Order::FULFILLMENT_DINE_IN)
                            ->whereIn('status', [
                                Order::STATUS_PENDING,
                                Order::STATUS_PREPARING,
                                Order::STATUS_READY,
                            ]);
                    })
                    ->orWhere(function ($delivery) {
                        $delivery
                            ->where('fulfillment_type', Order::FULFILLMENT_DELIVERY)
                            ->whereIn('status', [
                                Order::STATUS_ACCEPTED,
                                Order::STATUS_PREPARING,
                                Order::STATUS_READY,
                            ]);
                    });
            });

        [$orders, $meta] = KeysetPaginator::paginate($query, $request, 'id', 'asc');

        return response()->json([
            'success' => true,
            'data' => $orders->map(fn (Order $order) => $this->transform($order, includeUser: true))->values(),
            'meta' => $meta,
        ]);
    }

    public function deliveries(Request $request): JsonResponse
    {
        $this->authorize('viewDeliveries', Order::class);

        $query = Order::query()
            ->selectApi()
            ->withApiRelations(includeUser: true)
            ->paymentSettled()
            ->where('fulfillment_type', Order::FULFILLMENT_DELIVERY)
            ->whereIn('status', [
                Order::STATUS_PENDING,
                Order::STATUS_ACCEPTED,
                Order::STATUS_PREPARING,
                Order::STATUS_READY,
                Order::STATUS_OUT_FOR_DELIVERY,
                Order::STATUS_DELIVERED,
                Order::STATUS_RECEIVED,
            ]);

        [$orders, $meta] = KeysetPaginator::paginate($query, $request, 'id', 'desc');

        return response()->json([
            'success' => true,
            'data' => $orders->map(fn (Order $order) => $this->transform($order, includeUser: true))->values(),
            'meta' => $meta,
        ]);
    }

    public function drivers(): JsonResponse
    {
        $this->authorize('viewDeliveries', Order::class);

        $drivers = $this->cache->rememberDrivers(function () {
            return User::query()
                ->select(['id', 'name', 'email'])
                ->whereHas('roles', fn ($query) => $query->whereIn('name', [Role::DELIVERY, Role::DRIVER]))
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ])
                ->all();
        });

        return response()->json([
            'success' => true,
            'data' => $drivers,
        ]);
    }

    public function store(StoreOrderRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();
        $fulfillment = $validated['fulfillment_type'] ?? Order::FULFILLMENT_DINE_IN;
        $paymentMethod = $validated['payment_method'] ?? Order::PAYMENT_METHOD_CASH;

        $order = DB::transaction(function () use ($validated, $user, $fulfillment, $paymentMethod) {
            $menuItemIds = collect($validated['items'])->pluck('menu_item_id')->unique()->all();
            $menuItems = MenuItem::query()
                ->select(['id', 'name', 'price', 'is_available'])
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
                'table_id' => $fulfillment === Order::FULFILLMENT_DELIVERY
                    ? null
                    : ($validated['table_id'] ?? null),
                'fulfillment_type' => $fulfillment,
                'delivery_address' => $fulfillment === Order::FULFILLMENT_DELIVERY
                    ? trim((string) ($validated['delivery_address'] ?? ''))
                    : null,
                'delivery_phone' => $fulfillment === Order::FULFILLMENT_DELIVERY
                    ? trim((string) ($validated['delivery_phone'] ?? ''))
                    : null,
                'delivery_notes' => $fulfillment === Order::FULFILLMENT_DELIVERY
                    ? (isset($validated['delivery_notes']) ? trim((string) $validated['delivery_notes']) ?: null : null)
                    : null,
                'status' => Order::STATUS_PENDING,
                'total' => 0,
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentMethod === Order::PAYMENT_METHOD_CHAPA
                    ? Order::PAYMENT_PENDING
                    : Order::PAYMENT_NOT_REQUIRED,
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

            return $order->fresh([
                'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
                'items.menuItem:id,name',
                'table:id,name',
                'driver:id,name,email',
            ]);
        });

        $checkoutUrl = null;

        if ($paymentMethod === Order::PAYMENT_METHOD_CHAPA) {
            try {
                $clientUrl = rtrim((string) env('CLIENT_URL', 'http://localhost:5173'), '/');
                $returnUrl = $clientUrl.'/orders?order_id='.$order->id;
                $callbackUrl = rtrim((string) config('app.url'), '/').'/api/payments/chapa/callback';

                $initialized = $this->chapa->initialize($order, $user, $returnUrl, $callbackUrl);
                $order->update(['payment_reference' => $initialized['tx_ref']]);
                $checkoutUrl = $initialized['checkout_url'];
            } catch (Throwable $error) {
                $order->update(['payment_status' => Order::PAYMENT_FAILED]);

                throw ValidationException::withMessages([
                    'payment_method' => [$error->getMessage() ?: 'Could not start online payment.'],
                ]);
            }
        }

        $response = [
            'success' => true,
            'data' => $this->transform($order->fresh([
                'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
                'items.menuItem:id,name',
                'table:id,name',
                'driver:id,name,email',
            ])),
            'message' => $paymentMethod === Order::PAYMENT_METHOD_CHAPA
                ? 'Order created. Complete payment to send it to the kitchen.'
                : 'Order placed.',
        ];

        if ($paymentMethod === Order::PAYMENT_METHOD_CASH) {
            $this->notifications->notifyManagersOfCashOrder($order);
        }

        if ($checkoutUrl) {
            $response['checkout_url'] = $checkoutUrl;
        }

        $this->cache->forgetAdminDashboard();

        return response()->json($response, 201);
    }

    public function receipt(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        if (
            $order->user_id !== $request->user()->id
            && ! $request->user()->can(Permission::CAN_VIEW_ALL_ORDERS)
            && ! $request->user()->can(Permission::CAN_MANAGE_PAYMENTS)
        ) {
            abort(403);
        }

        $order->load([
            'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
            'items.menuItem:id,name',
            'table:id,name',
            'user:id,name,email',
            'driver:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'receipt_number' => 'R-'.$order->id,
                'issued_at' => now()->toIso8601String(),
                'order' => $this->transform($order, includeUser: true),
            ],
        ]);
    }

    public function verifyPayment(Request $request, Order $order): JsonResponse
    {
        $this->authorize('view', $order);

        if ($order->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($order->payment_method !== Order::PAYMENT_METHOD_CHAPA) {
            return response()->json([
                'success' => true,
                'data' => $this->transform($order->load([
                    'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
                    'items.menuItem:id,name',
                    'table:id,name',
                    'driver:id,name,email',
                ])),
                'message' => 'No online payment required.',
            ]);
        }

        if ($order->payment_status === Order::PAYMENT_PAID) {
            return response()->json([
                'success' => true,
                'data' => $this->transform($order->load([
                    'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
                    'items.menuItem:id,name',
                    'table:id,name',
                    'driver:id,name,email',
                ])),
                'message' => 'Payment already confirmed.',
            ]);
        }

        $txRef = $request->query('tx_ref')
            ?? $request->query('trx_ref')
            ?? $order->payment_reference;

        if (! is_string($txRef) || $txRef === '') {
            throw ValidationException::withMessages([
                'tx_ref' => ['Missing payment reference.'],
            ]);
        }

        try {
            $verified = $this->chapa->verify($txRef);
        } catch (RuntimeException $error) {
            throw ValidationException::withMessages([
                'payment' => [$error->getMessage()],
            ]);
        }

        if ($this->chapa->isSuccessfulStatus($verified['status'])) {
            $order->markPaid($txRef);
        } else {
            $order->update(['payment_status' => Order::PAYMENT_FAILED]);
        }

        $this->cache->forgetAdminDashboard();

        $order->load([
            'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
            'items.menuItem:id,name',
            'table:id,name',
            'driver:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->transform($order),
            'message' => $order->payment_status === Order::PAYMENT_PAID
                ? 'Payment confirmed.'
                : 'Payment not completed yet.',
        ]);
    }

    public function updateStatus(UpdateOrderStatusRequest $request, Order $order): JsonResponse
    {
        $nextStatus = $request->validated('status');

        if (! $order->canUserTransition($request->user(), $nextStatus)) {
            throw ValidationException::withMessages([
                'status' => ["Cannot transition from {$order->status} to {$nextStatus}."],
            ]);
        }

        if ($nextStatus === Order::STATUS_OUT_FOR_DELIVERY && $order->driver_id === null) {
            throw ValidationException::withMessages([
                'status' => ['Assign a driver before starting the delivery.'],
            ]);
        }

        $order->update(['status' => $nextStatus]);
        $this->cache->forgetAdminDashboard();
        $order->load([
            'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
            'items.menuItem:id,name',
            'table:id,name',
            'user:id,name,email',
            'driver:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->transform($order, includeUser: true),
            'message' => 'Order status updated.',
        ]);
    }

    public function assignDriver(AssignOrderDriverRequest $request, Order $order): JsonResponse
    {
        if (! in_array($order->status, [Order::STATUS_ACCEPTED, Order::STATUS_PREPARING, Order::STATUS_READY, Order::STATUS_OUT_FOR_DELIVERY], true)) {
            throw ValidationException::withMessages([
                'driver_id' => ['A driver cannot be assigned to an order in this status.'],
            ]);
        }

        $driver = User::query()->findOrFail($request->validated('driver_id'));
        $driver->loadMissing('roles');

        if (! $driver->roles->contains(fn ($r) => in_array($r->name, [Role::DELIVERY, Role::DRIVER], true))) {
            throw ValidationException::withMessages([
                'driver_id' => ['Selected user does not have the delivery role.'],
            ]);
        }

        $order->update(['driver_id' => $driver->id]);
        $this->cache->forgetAdminDashboard();
        $order->load([
            'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
            'items.menuItem:id,name',
            'table:id,name',
            'user:id,name,email',
            'driver:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->transform($order, includeUser: true),
            'message' => 'Driver assigned.',
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
        $this->cache->forgetAdminDashboard();
        $order->load([
            'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
            'items.menuItem:id,name',
            'table:id,name',
            'driver:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->transform($order),
            'message' => 'Order cancelled.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function toApiArray(Order $order, bool $includeUser = false): array
    {
        return $this->transform($order, $includeUser);
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
            'fulfillment_type' => $order->fulfillment_type ?? Order::FULFILLMENT_DINE_IN,
            'delivery_address' => $order->delivery_address,
            'delivery_phone' => $order->delivery_phone,
            'delivery_notes' => $order->delivery_notes,
            'driver_id' => $order->driver_id,
            'status' => $order->status,
            'total' => $order->total,
            'payment_method' => $order->payment_method ?? Order::PAYMENT_METHOD_CASH,
            'payment_status' => $order->payment_status ?? Order::PAYMENT_NOT_REQUIRED,
            'payment_reference' => $order->payment_reference,
            'paid_at' => $order->paid_at?->toIso8601String(),
            'cashier_approved_at' => $order->cashier_approved_at?->toIso8601String(),
            'cashier_approved_by' => $order->cashier_approved_by,
            'cash_collected_at' => $order->cash_collected_at?->toIso8601String(),
            'cash_collected_by' => $order->cash_collected_by,
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),
            'table' => $order->relationLoaded('table') && $order->table
                ? [
                    'id' => $order->table->id,
                    'name' => $order->table->name,
                ]
                : null,
            'driver' => $order->relationLoaded('driver') && $order->driver
                ? [
                    'id' => $order->driver->id,
                    'name' => $order->driver->name,
                    'email' => $order->driver->email,
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
