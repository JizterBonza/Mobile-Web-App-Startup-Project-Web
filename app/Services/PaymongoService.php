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
        return Http::withBasicAuth($this->secret, '')
            ->withHeaders([
                'Content-Type' => 'application/json'
            ]);
    }

    public function createPaymentIntent($amount, $methods = ['gcash','card'])
    {
        //Uncomment this to use the original client
        // $response = $this->client()->post($this->baseUrl.'/payment_intents', [
        //     'data' => [
        //         'attributes' => [
        //             'amount' => $amount * 100,
        //             'payment_method_allowed' => $methods,
        //             'currency' => 'PHP'
        //         ]
        //     ]
        // ]);

        //Comment this to use the original client
        $response = Http::withOptions([
            'verify' => false
        ])->withBasicAuth($this->secret, '')
        ->post($this->baseUrl.'/payment_intents', [
            'data' => [
                'attributes' => [
                    'amount' => $amount * 100,
                    'payment_method_allowed' => ['gcash','card'],
                    'currency' => 'PHP'
                ]
            ]
        ]);

        return $response->json();
    }

    public function createPaymentMethod($type, $details)
    {
        //Uncomment this to use the original client
        // $response = $this->client()->post($this->baseUrl.'/payment_methods', [
        //     'data' => [
        //         'attributes' => [
        //             'type' => $type,
        //             'details' => $details
        //         ]
        //     ]
        // ]);

        //Comment this to use the original client
        $response = Http::withOptions([
            'verify' => false
        ])->withBasicAuth($this->secret, '')
        ->post($this->baseUrl.'/payment_methods', [
            'data' => [
                'attributes' => [
                    'type' => $type,
                    'details' => $details
                ]
            ]
        ]);

        return $response->json();
    }

    public function attachPaymentIntent($paymentIntentId, $paymentMethodId, $returnUrl)
    {
        //Uncomment this to use the original client
        // $response = $this->client()->post(
        //     $this->baseUrl."/payment_intents/$paymentIntentId/attach",
        //     [
        //         'data' => [
        //             'attributes' => [
        //                 'payment_method' => $paymentMethodId,
        //                 'return_url' => $returnUrl
        //             ]
        //         ]
        //     ]
        // );

        //Comment this to use the original client
        $response = Http::withOptions([
            'verify' => false
        ])->withBasicAuth($this->secret, '')->post(
            $this->baseUrl."/payment_intents/$paymentIntentId/attach",
            [
                'data' => [
                    'attributes' => [
                        'payment_method' => $paymentMethodId,
                        'return_url' => $returnUrl
                    ]
                ]
            ]
        );

        return $response->json();
    }

    public function retrievePaymentIntent($paymentIntentId)
    {
        //Comment this to use the original client
        $response = Http::withOptions([
            'verify' => false
        ])->withBasicAuth($this->secret, '')->get(
            $this->baseUrl."/payment_intents/$paymentIntentId"
        );

        //Uncomment this to use the original client
        // $response = $this->client()->get(
        //     $this->baseUrl."/payment_intents/$paymentIntentId"
        // );

        return $response->json();
    }

    public function createCheckoutSession($amount, $description = "Order Payment")
    {
        //Uncomment this to use the original client
        // $response = Http::withBasicAuth($this->secret, '')
        // ->post($this->baseUrl.'/checkout_sessions', [
        //     'data' => [
        //         'attributes' => [
        //             'send_email_receipt' => false,
        //             'show_description' => true,
        //             'show_line_items' => true,
        //             'cancel_url' => config('app.url').'/payment-cancel',
        //             'success_url' => config('app.url').'/payment-success',
        //             'line_items' => [
        //                 [
        //                     'currency' => 'PHP',
        //                     'amount' => $amount * 100,
        //                     'description' => $description,
        //                     'name' => 'Order Payment',
        //                     'quantity' => 1
        //                 ]
        //             ],
        //             'payment_method_types' => [
        //                 'gcash',
        //                 'paymaya',
        //                 'card',
        //                 'qrph'
        //             ]
        //         ]
        //     ]
        // ]);

        //Comment this to use the original client
        $response = Http::withOptions([
            'verify' => false
        ])->withBasicAuth($this->secret, '')
        ->post($this->baseUrl.'/checkout_sessions', [
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
                    'payment_method_types' => [
                        'gcash',
                        'paymaya',
                        //'card',
                        //'qrph'
                    ]
                ]
            ]
        ]);

        return $response->json();
    }
}