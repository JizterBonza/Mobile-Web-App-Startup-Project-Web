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
}