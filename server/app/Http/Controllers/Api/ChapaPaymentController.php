<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\ChapaPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Throwable;

class ChapaPaymentController extends Controller
{
    public function __construct(
        private readonly ChapaPaymentService $chapa,
    ) {}

    /**
     * Chapa callback_url (GET) after checkout — verify and acknowledge.
     */
    public function callback(Request $request): JsonResponse
    {
        $txRef = $request->query('trx_ref')
            ?? $request->query('tx_ref')
            ?? $request->input('trx_ref')
            ?? $request->input('tx_ref');

        if (! is_string($txRef) || $txRef === '') {
            return response()->json(['success' => false, 'message' => 'Missing tx_ref.'], 422);
        }

        $this->markOrderPaidFromReference($txRef);

        return response()->json(['success' => true]);
    }

    /**
     * Dashboard webhook (POST) when payment succeeds.
     */
    public function webhook(Request $request): Response|JsonResponse
    {
        $secret = (string) config('services.chapa.secret_key');
        $signature = $request->header('x-chapa-signature')
            ?? $request->header('Chapa-Signature');

        if ($secret !== '') {
            if (! is_string($signature) || $signature === '') {
                Log::warning('Chapa webhook missing signature header.');

                return response()->json(['success' => false, 'message' => 'Missing signature header.'], 401);
            }

            $expected = hash_hmac('sha256', $request->getContent(), $secret);
            if (! hash_equals($expected, $signature)) {
                Log::warning('Chapa webhook signature mismatch.');

                return response()->json(['success' => false, 'message' => 'Invalid signature.'], 401);
            }
        }

        $txRef = $request->input('trx_ref')
            ?? $request->input('tx_ref')
            ?? data_get($request->all(), 'data.tx_ref')
            ?? data_get($request->all(), 'tx_ref');

        if (! is_string($txRef) || $txRef === '') {
            return response()->json(['success' => false, 'message' => 'Missing tx_ref.'], 422);
        }

        $this->markOrderPaidFromReference($txRef);

        return response()->json(['success' => true]);
    }

    private function markOrderPaidFromReference(string $txRef): void
    {
        $order = Order::query()
            ->where('payment_reference', $txRef)
            ->orWhere('payment_reference', str_replace('trx_ref=', '', $txRef))
            ->first();

        if (! $order || $order->payment_method !== Order::PAYMENT_METHOD_CHAPA) {
            return;
        }

        if ($order->payment_status === Order::PAYMENT_PAID) {
            return;
        }

        try {
            $verified = $this->chapa->verify($txRef);
            if ($this->chapa->isSuccessfulStatus($verified['status'])) {
                $order->markPaid($txRef);
            }
        } catch (Throwable $error) {
            Log::warning('Chapa verify from webhook failed: '.$error->getMessage());
        }
    }
}
