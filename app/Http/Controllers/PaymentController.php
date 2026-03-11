<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PaymongoService;

class PaymentController extends Controller
{
    protected $paymongo;

    public function __construct(PaymongoService $paymongo)
    {
        $this->paymongo = $paymongo;
    }

    public function createIntent(Request $request)
    {
        $amount = $request->amount;

        $intent = $this->paymongo->createPaymentIntent($amount);

        return response()->json($intent);
    }

    public function attachPayment(Request $request)
    {
        $intentId = $request->payment_intent_id;
        $methodId = $request->payment_method_id;

        $response = $this->paymongo->attachPaymentIntent(
            $intentId,
            $methodId,
            config('app.url').'/api/payment-success'
        );

        return response()->json($response);
    }

    public function paymentSuccess(Request $request)
    {
        $paymentIntentId = $request->payment_intent_id;

        $payment = $this->paymongo->retrievePaymentIntent($paymentIntentId);

        $status = $payment['data']['attributes']['status'];

        if ($status === 'succeeded') {

            // update order as paid

            return response()->json([
                'message' => 'Payment successful',
                'payment_intent_id' => $paymentIntentId
            ]);
        }

        return response()->json([
            'message' => 'Payment not completed',
            'status' => $status
        ]);
    }

    public function checkout(Request $request)
    {
        $amount = $request->amount;

        $session = $this->paymongo->createCheckoutSession($amount);

        return response()->json([
            'checkout_url' => $session['data']['attributes']['checkout_url'],
            'session_id' => $session['data']['id']
        ]);
    }
}