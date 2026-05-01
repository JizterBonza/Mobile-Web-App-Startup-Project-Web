<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymongoService
{
    protected string $secret;
    protected string $baseUrl;

    public function __construct()
    {
        $this->secret = config('services.paymongo.secret');
        $this->baseUrl = config('services.paymongo.base_url');
    }

    private function client()
    {
        return Http::withBasicAuth($this->secret, '')
            ->withHeaders([
                'Content-Type' => 'application/json'
            ]);
    }

    public function createPaymentIntent($amount, $methods = ['gcash','card'])
    {
        $response = $this->post('/payment_intents', [
            'data' => [
                'attributes' => [
                    'amount' => $amount * 100,
                    'payment_method_allowed' => $methods,
                    'currency' => 'PHP'
                ]
            ]
        ], 'payment.intent.create');

        return $response;
    }

    public function createPaymentMethod($type, $details)
    {
        $response = $this->post('/payment_methods', [
            'data' => [
                'attributes' => [
                    'type' => $type,
                    'details' => $details
                ]
            ]
        ], 'payment.method.create');

        return $response;
    }

    public function attachPaymentIntent($paymentIntentId, $paymentMethodId, $returnUrl)
    {
        return $this->post(
            "/payment_intents/$paymentIntentId/attach",
            [
            'data' => [
                'attributes' => [
                    'payment_method' => $paymentMethodId,
                    'return_url' => $returnUrl
                ]
            ]
        ],
            'payment.intent.attach'
        );
    }

    public function retrievePaymentIntent($paymentIntentId)
    {
        $response = $this->client()->get(
            $this->baseUrl."/payment_intents/$paymentIntentId"
        );

        if (!$response->successful()) {
            Log::error('payment.intent.retrieve_failed', [
                'payment_intent_id' => $paymentIntentId,
                'status_code' => $response->status(),
                'response' => $this->maskSensitiveData($response->json() ?? []),
            ]);
        }

        return $response->json();
    }

    public function createCheckoutSession($amount, $description = "Order Payment", ?array $paymentMethodTypes = null, array $metadata = [])
    {
        return $this->post('/checkout_sessions', [
            'data' => [
                'attributes' => [
                    'send_email_receipt' => false,
                    'show_description' => true,
                    'show_line_items' => true,
                    'cancel_url' => config('app.url').'/api/payment-cancel',
                    'success_url' => config('app.url').'/api/payment-success',
                    'line_items' => [
                        [
                            'currency' => 'PHP',
                            'amount' => $amount * 100,
                            'description' => $description,
                            'name' => 'Order Payment',
                            'quantity' => 1
                        ]
                    ],
                    'payment_method_types' => $paymentMethodTypes ?: ['gcash', 'paymaya'],
                    'metadata' => $metadata,
                ]
            ]
        ], 'payment.checkout.create');
    }

    public function createCheckoutSessionForOrder(Order $order, ?string $paymentMethod = null): array
    {
        $order->loadMissing('orderDetail');

        $amount = (float) ($order->orderDetail?->total_amount ?? 0);
        $reference = 'ORD-' . $order->id . '-' . now()->format('YmdHis');

        return $this->createCheckoutSession(
            $amount,
            'Order #' . $order->id . ' Payment',
            $this->resolvePaymentMethodTypes($paymentMethod),
            [
                'order_id' => (string) $order->id,
                'payment_reference' => $reference,
            ]
        );
    }

    public function verifyWebhookSignature(string $rawBody, ?string $signatureHeader): bool
    {
        if (!$signatureHeader) {
            return false;
        }

        $parts = [];
        foreach (explode(',', $signatureHeader) as $part) {
            $part = trim($part);
            if (!str_contains($part, '=')) {
                continue;
            }

            [$key, $value] = explode('=', $part, 2);
            $parts[$key] = $value;
        }

        $timestamp = $parts['t'] ?? null;
        $testSig = $parts['te'] ?? null;
        $liveSig = $parts['li'] ?? null;

        if (!$timestamp) {
            return false;
        }

        $message = $timestamp . '.' . $rawBody;
        $secret = config('services.paymongo.webhook_secret');
        $computed = hash_hmac('sha256', $message, (string) $secret);
        $expectedSig = app()->environment('production') ? $liveSig : $testSig;

        return hash_equals((string) $expectedSig, $computed);
    }

    public function mapEventToCanonicalStatus(?string $eventType): string
    {
        return match ((string) $eventType) {
            'checkout_session.payment.paid',
            'payment.paid' => Payment::STATUS_PAID,

            'checkout_session.payment.failed',
            'payment.failed' => Payment::STATUS_FAILED,

            'checkout_session.expired',
            'checkout_session.payment.expired' => Payment::STATUS_EXPIRED,

            'checkout_session.cancelled',
            'checkout_session.payment.cancelled' => Payment::STATUS_CANCELLED,

            default => Payment::STATUS_PENDING,
        };
    }

    public function registerWebhook(string $url, array $events = [
        'checkout_session.payment.paid',
        'checkout_session.payment.failed',
    ])
    {
        return $this->post('/webhooks', [
            'data' => [
                'attributes' => [
                    'url' => $url,
                    'events' => $events,
                ]
            ]
        ], 'payment.webhook.register');
    }

    private function post(string $path, array $payload, string $logMarker): array
    {
        $response = $this->client()->post($this->baseUrl . $path, $payload);
        $json = $response->json();

        if (!$response->successful()) {
            Log::error($logMarker . '_failed', [
                'path' => $path,
                'status_code' => $response->status(),
                'request' => $this->maskSensitiveData($payload),
                'response' => $this->maskSensitiveData($json ?? []),
            ]);
        }

        return is_array($json) ? $json : [];
    }

    private function resolvePaymentMethodTypes(?string $paymentMethod): array
    {
        $method = strtolower(trim((string) $paymentMethod));

        return match ($method) {
            'gcash' => ['gcash'],
            'paymaya', 'maya' => ['paymaya'],
            'card' => ['card'],
            'qrph' => ['qrph'],
            default => ['gcash', 'paymaya'],
        };
    }

    private function maskSensitiveData(array $payload): array
    {
        $sensitiveKeys = [
            'authorization',
            'secret',
            'token',
            'password',
            'card_number',
            'email',
            'phone',
        ];

        $masked = [];
        foreach ($payload as $key => $value) {
            if (is_array($value)) {
                $masked[$key] = $this->maskSensitiveData($value);
                continue;
            }

            if (in_array(strtolower((string) $key), $sensitiveKeys, true)) {
                $masked[$key] = '***';
                continue;
            }

            $masked[$key] = $value;
        }

        return $masked;
    }
}
