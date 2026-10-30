<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class PaymongoService
{
    protected $secret;

    protected $baseUrl;

    public function __construct()
    {
        $this->secret = config('services.paymongo.secret');
        $this->baseUrl = config('services.paymongo.base_url');
    }

    private function client()
    {
        return Http::withBasicAuth($this->secret, '')->connectTimeout(5)->timeout(20)
            ->withHeaders([
                'Content-Type' => 'application/json',
            ]);
    }

    public function createPaymentIntent($amount, $methods = ['gcash', 'card'], array $options = [])
    {
        $response = $this->client()->post($this->baseUrl.'/payment_intents', [
            'data' => [
                'attributes' => [
                    'amount' => FarmCheckoutService::cents($amount),
                    'metadata' => $options['metadata'] ?? [],
                    'payment_method_allowed' => $methods,
                    'currency' => 'PHP',
                ],
            ],
        ]);

        return array_merge($response->json() ?? [], ['_creation_rejected' => $response->status() >= 400 && $response->status() < 500 && ! in_array($response->status(), [408, 409, 429], true)]);
    }

    public function createPaymentMethod($type, $details)
    {
        $response = $this->client()->post($this->baseUrl.'/payment_methods', [
            'data' => [
                'attributes' => [
                    'type' => $type,
                    'details' => $details,
                ],
            ],
        ]);

        return $response->json() ?? [];
    }

    public function attachPaymentIntent($paymentIntentId, $paymentMethodId, $returnUrl)
    {
        $response = $this->client()->post(
            $this->baseUrl.'/payment_intents/'.rawurlencode($paymentIntentId).'/attach',
            [
                'data' => [
                    'attributes' => [
                        'payment_method' => $paymentMethodId,
                        'return_url' => $returnUrl,
                    ],
                ],
            ]
        );

        return $response->json() ?? [];
    }

    public function retrievePaymentIntent($paymentIntentId)
    {
        $response = $this->client()->get(
            $this->baseUrl.'/payment_intents/'.rawurlencode($paymentIntentId)
        );

        return $response->json() ?? [];
    }

    public function retrieveCheckoutSession(string $sessionId)
    {
        $response = $this->client()->get(
            $this->baseUrl.'/checkout_sessions/'.rawurlencode($sessionId)
        );

        return $response->json() ?? [];
    }

    public function expireCheckoutSession(string $sessionId): array
    {
        return $this->client()->timeout(20)->post($this->baseUrl.'/checkout_sessions/'.rawurlencode($sessionId).'/expire')->json() ?? [];
    }

    public function createCheckoutSession($amount, $description = 'Order Payment', array $options = [])
    {
        $attributes = [
            'send_email_receipt' => false,
            'show_description' => true,
            'show_line_items' => true,
            'cancel_url' => $options['cancel_url'] ?? (config('app.url').'/api/payment-cancel'),
            'success_url' => $options['success_url'] ?? (config('app.url').'/api/payment-success'),
            'line_items' => [
                [
                    'currency' => 'PHP',
                    'amount' => (int) round($amount * 100),
                    'description' => $description,
                    'name' => 'Order Payment',
                    'quantity' => 1,
                ],
            ],
            'payment_method_types' => [
                'gcash',
                'paymaya',
                'qrph',
                // 'card',
            ],
        ];

        if (! empty($options['reference_number'])) {
            $attributes['reference_number'] = (string) $options['reference_number'];
        }

        if (! empty($options['metadata']) && is_array($options['metadata'])) {
            $attributes['metadata'] = $options['metadata'];
        }

        $response = $this->client()->post($this->baseUrl.'/checkout_sessions', [
            'data' => [
                'attributes' => $attributes,
            ],
        ]);

        return array_merge($response->json() ?? [], ['_creation_rejected' => $response->status() >= 400 && $response->status() < 500 && ! in_array($response->status(), [408, 409, 429], true)]);
    }

    public function registerWebhook(string $url, array $events = [
        'checkout_session.payment.paid',
        'checkout_session.payment.failed',
        'payment.paid',
        'payment.failed',
    ])
    {
        $response = $this->client()->post($this->baseUrl.'/webhooks', [
            'data' => [
                'attributes' => [
                    'url' => $url,
                    'events' => $events,
                ],
            ],
        ]);

        return $response->json() ?? [];
    }
}
