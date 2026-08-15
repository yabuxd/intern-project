<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ChapaPaymentService
{
    /**
     * @return array{checkout_url: string, tx_ref: string}
     */
    public function initialize(Order $order, User $user, string $returnUrl, ?string $callbackUrl = null): array
    {
        $secret = (string) config('services.chapa.secret_key');
        $baseUrl = (string) config('services.chapa.base_url');

        if ($secret === '' || $baseUrl === '') {
            throw new RuntimeException('CHAPA_SECRET_KEY and CHAPA_BASE_URL must be configured.');
        }

        $txRef = sprintf('order-%d-%s', $order->id, bin2hex(random_bytes(4)));
        $nameParts = preg_split('/\s+/', trim((string) ($user->name ?: 'Customer')), 2) ?: [];
        $firstName = $nameParts[0] !== '' ? $nameParts[0] : 'Customer';
        $lastName = $nameParts[1] ?? 'Guest';

        $payload = [
            'amount' => number_format((float) $order->total, 2, '.', ''),
            'currency' => 'ETB',
            'email' => $user->email,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'tx_ref' => $txRef,
            'return_url' => $returnUrl,
            'customization' => [
                'title' => 'Restaurant Order',
                'description' => 'Order #'.$order->id,
            ],
            'meta' => [
                'order_id' => (string) $order->id,
            ],
        ];

        if ($callbackUrl) {
            $payload['callback_url'] = $callbackUrl;
        }

        if ($order->delivery_phone) {
            $digits = preg_replace('/\D+/', '', $order->delivery_phone) ?? '';
            if (strlen($digits) >= 10) {
                $payload['phone_number'] = substr($digits, -10);
            }
        }

        $response = Http::timeout(20)
            ->withToken($secret)
            ->acceptJson()
            ->post($baseUrl.'/v1/transaction/initialize', $payload);

        if (! $response->successful()) {
            throw new RuntimeException(
                $response->json('message')
                    ?? 'Failed to initialize Chapa payment.'
            );
        }

        $checkoutUrl = $response->json('data.checkout_url');
        if (! is_string($checkoutUrl) || $checkoutUrl === '') {
            throw new RuntimeException('Chapa did not return a checkout URL.');
        }

        return [
            'checkout_url' => $checkoutUrl,
            'tx_ref' => $txRef,
        ];
    }

    /**
     * @return array{status: string, amount: float|null, tx_ref: string}
     */
    public function verify(string $txRef): array
    {
        $secret = (string) config('services.chapa.secret_key');
        $baseUrl = (string) config('services.chapa.base_url');

        if ($secret === '' || $baseUrl === '') {
            throw new RuntimeException('CHAPA_SECRET_KEY and CHAPA_BASE_URL must be configured.');
        }

        $response = Http::timeout(20)
            ->withToken($secret)
            ->acceptJson()
            ->get($baseUrl.'/v1/transaction/verify/'.rawurlencode($txRef));

        if (! $response->successful()) {
            throw new RuntimeException(
                $response->json('message')
                    ?? 'Failed to verify Chapa payment.'
            );
        }

        $status = strtolower((string) ($response->json('data.status') ?? ''));
        $amount = $response->json('data.amount');

        return [
            'status' => $status,
            'amount' => is_numeric($amount) ? (float) $amount : null,
            'tx_ref' => $txRef,
        ];
    }

    public function isSuccessfulStatus(string $status): bool
    {
        return in_array(strtolower($status), ['success', 'successful'], true);
    }
}
