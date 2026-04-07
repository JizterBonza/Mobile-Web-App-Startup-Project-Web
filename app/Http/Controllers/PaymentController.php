<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PaymongoService;
use App\Models\Payment;

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

    public function handleWebhook(Request $request)
    {
        $rawBody = $request->getContent();
        $signatureHeader = $request->header('Paymongo-Signature');

        if (!$this->verifyWebhookSignature($rawBody, $signatureHeader)) {
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $payload = json_decode($rawBody, true);
        $eventType = $payload['data']['attributes']['type'] ?? null;
        $data = $payload['data']['attributes']['data'] ?? null;

        switch ($eventType) {
            case 'checkout_session.payment.paid':
                $this->handleCheckoutPaid($data);
                break;
            case 'checkout_session.payment.failed':
                // handle failed payment if needed
                break;
        }

        return response()->json(['received' => true]);
    }

    private function verifyWebhookSignature(string $rawBody, ?string $signatureHeader): bool
    {
        if (!$signatureHeader) return false;

        $parts = [];
        foreach (explode(',', $signatureHeader) as $part) {
            [$key, $value] = explode('=', $part, 2);
            $parts[$key] = $value;
        }

        $timestamp = $parts['t'] ?? null;
        $testSig = $parts['te'] ?? null;
        $liveSig = $parts['li'] ?? null;

        if (!$timestamp) return false;

        $message = $timestamp . '.' . $rawBody;
        $secret = config('services.paymongo.webhook_secret');
        $computed = hash_hmac('sha256', $message, $secret);

        $expectedSig = app()->environment('production') ? $liveSig : $testSig;

        return hash_equals($computed, $expectedSig ?? '');
    }

    private function handleCheckoutPaid(array $data): void
    {
        $sessionId = $data['id'] ?? null;
        $payment = Payment::where('checkout_session_id', $sessionId)->first();
        if ($payment) {
            $payment->update(['status' => 'paid']);
        }
    }

    /**
     * Get checkout_url for an order by order_id.
     *
     * @param int $orderId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCheckoutUrlByOrderId($orderId)
    {
        $payment = Payment::where('order_id', $orderId)->first();

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Payment not found for this order',
            ], 404);
        }

        if (empty($payment->checkout_url)) {
            return response()->json([
                'success' => false,
                'message' => 'Checkout URL not available for this order',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'checkout_url' => $payment->checkout_url,
        ]);
    }
}