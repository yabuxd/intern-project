<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Permission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CashierController extends Controller
{
    public function desk(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can(Permission::CAN_MANAGE_PAYMENTS), 403);

        $awaitingChapa = Order::query()
            ->selectApi()
            ->withApiRelations(includeUser: true)
            ->where('payment_method', Order::PAYMENT_METHOD_CHAPA)
            ->where('payment_status', Order::PAYMENT_PAID)
            ->whereNull('cashier_approved_at')
            ->orderBy('id')
            ->get();

        $openCash = Order::query()
            ->selectApi()
            ->withApiRelations(includeUser: true)
            ->where('payment_method', Order::PAYMENT_METHOD_CASH)
            ->where('payment_status', Order::PAYMENT_NOT_REQUIRED)
            ->whereNull('cash_collected_at')
            ->whereNotIn('status', [Order::STATUS_CANCELLED])
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'awaiting_chapa_validation' => $awaitingChapa
                    ->map(fn (Order $order) => $this->transform($order))
                    ->values(),
                'open_cash' => $openCash
                    ->map(fn (Order $order) => $this->transform($order))
                    ->values(),
            ],
        ]);
    }

    public function approve(Request $request, Order $order): JsonResponse
    {
        abort_unless($request->user()?->can(Permission::CAN_MANAGE_PAYMENTS), 403);

        if ($order->payment_method !== Order::PAYMENT_METHOD_CHAPA) {
            throw ValidationException::withMessages([
                'order' => ['Only Chapa orders need cashier validation.'],
            ]);
        }

        if ($order->payment_status !== Order::PAYMENT_PAID) {
            throw ValidationException::withMessages([
                'order' => ['Chapa payment is not confirmed yet.'],
            ]);
        }

        if ($order->cashier_approved_at !== null) {
            return response()->json([
                'success' => true,
                'data' => $this->transform($order->load([
                    'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
                    'items.menuItem:id,name',
                    'table:id,name',
                    'user:id,name,email',
                    'driver:id,name,email',
                ])),
                'message' => 'Already validated.',
            ]);
        }

        $order->approveByCashier($request->user());
        $order->load([
            'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
            'items.menuItem:id,name',
            'table:id,name',
            'user:id,name,email',
            'driver:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->transform($order),
            'message' => 'Payment validated. Order is visible to the kitchen.',
        ]);
    }

    public function collectCash(Request $request, Order $order): JsonResponse
    {
        abort_unless($request->user()?->can(Permission::CAN_MANAGE_PAYMENTS), 403);

        if ($order->payment_method !== Order::PAYMENT_METHOD_CASH) {
            throw ValidationException::withMessages([
                'order' => ['Only cash orders can be marked collected.'],
            ]);
        }

        if ($order->cash_collected_at !== null) {
            return response()->json([
                'success' => true,
                'data' => $this->transform($order->load([
                    'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
                    'items.menuItem:id,name',
                    'table:id,name',
                    'user:id,name,email',
                    'driver:id,name,email',
                ])),
                'message' => 'Cash already collected.',
            ]);
        }

        $order->collectCash($request->user());
        $order->load([
            'items:id,order_id,menu_item_id,quantity,unit_price,line_total',
            'items.menuItem:id,name',
            'table:id,name',
            'user:id,name,email',
            'driver:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->transform($order),
            'message' => 'Cash marked as collected.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Order $order): array
    {
        return app(OrderController::class)->toApiArray($order, includeUser: true);
    }
}
