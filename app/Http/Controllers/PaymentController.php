<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\PaymongoService;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;

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
        $paymentIntentId = $request->query('payment_intent_id') ?? $request->payment_intent_id;

        // Checkout sessions redirect here without a payment_intent_id; payment
        // confirmation is handled by the PayMongo webhook instead.
        if (empty($paymentIntentId)) {
            return response()->json([
                'success' => true,
                'message' => 'Payment received. Your order will be updated shortly.',
            ]);
        }

        $payment = $this->paymongo->retrievePaymentIntent($paymentIntentId);

        if (! is_array($payment) || empty($payment['data']['attributes'])) {
            Log::error('PayMongo retrieve payment intent failed', [
                'payment_intent_id' => $paymentIntentId,
                'response' => $payment,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Unable to verify payment status.',
            ], 422);
        }

        $status = $payment['data']['attributes']['status'];

        if ($status === 'succeeded') {
            return response()->json([
                'success' => true,
                'message' => 'Payment successful',
                'payment_intent_id' => $paymentIntentId,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Payment not completed',
            'status' => $status,
        ]);
    }

    public function checkout(Request $request)
    {
        $amount = $request->amount;

        $session = $this->paymongo->createCheckoutSession($amount);

        if (! is_array($session) || ! empty($session['errors'])) {
            Log::error('PayMongo checkout session creation failed', [
                'response' => $session,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create payment checkout session.',
            ], 422);
        }

        $sessionId = $session['data']['id'] ?? null;
        $checkoutUrl = $session['data']['attributes']['checkout_url'] ?? null;

        if (! $sessionId || ! $checkoutUrl) {
            Log::error('PayMongo checkout session response malformed', [
                'response' => $session,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid payment checkout response.',
            ], 422);
        }

        return response()->json([
            'success' => true,
            'checkout_url' => $checkoutUrl,
            'session_id' => $sessionId,
        ]);
    }

    public function handleWebhook(Request $request)
    {
        $rawBody = $request->getContent();
        $signatureHeader = $request->header('Paymongo-Signature');

        if (! $this->verifyWebhookSignature($rawBody, $signatureHeader)) {
            Log::warning('PayMongo webhook: invalid signature', [
                'has_signature_header' => ! empty($signatureHeader),
                'body_length' => strlen($rawBody),
            ]);

            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $payload = json_decode($rawBody, true);
        $eventType = $payload['data']['attributes']['type'] ?? null;
        $data = $payload['data']['attributes']['data'] ?? null;

        if (! is_array($data)) {
            Log::warning('PayMongo webhook: event payload missing data', [
                'event_type' => $eventType,
            ]);

            return response()->json(['received' => true]);
        }

        try {
            switch ($eventType) {
                case 'checkout_session.payment.paid':
                    $this->handleCheckoutPaid($data);
                    break;
                case 'checkout_session.payment.failed':
                    $this->handleCheckoutFailed($data);
                    break;
                case 'payment.paid':
                    $this->handlePaymentPaid($data);
                    break;
                case 'payment.failed':
                    $this->handlePaymentFailed($data);
                    break;
            }
        } catch (\Throwable $e) {
            Log::error('PayMongo webhook: handler failed', [
                'event_type' => $eventType,
                'message' => $e->getMessage(),
            ]);
        }

        return response()->json(['received' => true]);
    }

    private function verifyWebhookSignature(string $rawBody, ?string $signatureHeader): bool
    {
        if (! $signatureHeader || $rawBody === '') {
            return false;
        }

        $secret = config('services.paymongo.webhook_secret');
        if (! $secret) {
            Log::error('PayMongo webhook: PAYMONGO_WEBHOOK_SECRET is not configured');

            return false;
        }

        $parts = [];
        foreach (explode(',', $signatureHeader) as $part) {
            [$key, $value] = explode('=', $part, 2);
            $parts[$key] = $value;
        }

        $timestamp = $parts['t'] ?? null;
        $testSig = $parts['te'] ?? null;
        $liveSig = $parts['li'] ?? null;

        if (! $timestamp) {
            return false;
        }

        $computed = hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);

        // PayMongo sends te for test-mode events and li for live-mode events.
        // Match whichever signature is present — do not rely on APP_ENV.
        if ($testSig && hash_equals($computed, $testSig)) {
            return true;
        }

        if ($liveSig && hash_equals($computed, $liveSig)) {
            return true;
        }

        return false;
    }

    private function handleCheckoutPaid(array $data): void
    {
        $payment = $this->resolvePaymentFromCheckoutSession($data);
        if (! $payment) {
            return;
        }

        if ($payment->status === 'paid') {
            return;
        }

        // PayMongo attaches the actual Payment resources to the checkout session.
        // The first (and typically only) payment holds the method the customer used.
        $paymongoPayment = $data['attributes']['payments'][0] ?? null;
        $paymentAttrs = $paymongoPayment['attributes'] ?? [];

        $paymentMethod = $paymentAttrs['source']['type']
            ?? $paymentAttrs['payment_method_used']
            ?? null;

        $paymentIntentId = $data['attributes']['payment_intent']['id']
            ?? $paymentAttrs['payment_intent_id']
            ?? null;

        $this->markPaymentPaid(
            $payment,
            $paymongoPayment['id'] ?? null,
            $paymentMethod,
            $data,
            $paymentIntentId
        );
    }

    private function handleCheckoutFailed(array $data): void
    {
        $payment = $this->resolvePaymentFromCheckoutSession($data);
        if (! $payment) {
            return;
        }

        $paymongoPayment = $data['attributes']['payments'][0] ?? null;
        $paymentAttrs = $paymongoPayment['attributes'] ?? [];
        $paymentIntentId = $data['attributes']['payment_intent']['id']
            ?? $paymentAttrs['payment_intent_id']
            ?? null;

        $this->markPaymentFailed(
            $payment,
            $data,
            $paymongoPayment['id'] ?? null,
            $paymentIntentId
        );
    }

    private function handlePaymentPaid(array $data): void
    {
        $payment = $this->resolvePaymentFromPaymongoPayment($data);
        if (! $payment) {
            return;
        }

        if ($payment->status === 'paid') {
            return;
        }

        $attrs = $data['attributes'] ?? [];
        $paymentMethod = $attrs['source']['type'] ?? null;

        $this->markPaymentPaid(
            $payment,
            $data['id'] ?? null,
            $paymentMethod,
            $data,
            $attrs['payment_intent_id'] ?? null
        );
    }

    private function handlePaymentFailed(array $data): void
    {
        $payment = $this->resolvePaymentFromPaymongoPayment($data);
        if (! $payment) {
            return;
        }

        $attrs = $data['attributes'] ?? [];

        $this->markPaymentFailed(
            $payment,
            $data,
            $data['id'] ?? null,
            $attrs['payment_intent_id'] ?? null
        );
    }

    private function markPaymentPaid(
        Payment $payment,
        ?string $paymongoPaymentId,
        ?string $paymentMethod,
        array $metadata,
        ?string $paymentIntentId = null
    ): void {
        $payment->update([
            'status' => 'paid',
            'payment_method' => $paymentMethod,
            'payment_id' => $paymongoPaymentId ?? $payment->payment_id,
            'payment_intent_id' => $paymentIntentId ?? $payment->payment_intent_id,
            'metadata' => $metadata,
        ]);

        $payment->order?->orderDetail?->update(['payment_status' => 'paid']);

        $order = $payment->order;
        $orderDetail = $order?->orderDetail;
        if ($order && $orderDetail) {
            Notification::createForUser(
                $order->user_id,
                'payment_confirmed',
                'Payment Confirmed',
                "Your payment for order {$orderDetail->order_code} has been confirmed. Amount: ₱" . number_format($payment->amount, 2),
                Notification::CATEGORY_PAYMENT,
                $order,
                [
                    'order_id' => $order->id,
                    'order_code' => $orderDetail->order_code,
                    'amount' => $payment->amount,
                    'payment_method' => $paymentMethod,
                ],
                "/orders/{$order->id}"
            );
        }
    }

    private function markPaymentFailed(
        Payment $payment,
        array $metadata,
        ?string $paymongoPaymentId = null,
        ?string $paymentIntentId = null
    ): void {
        if (in_array($payment->status, ['paid', 'failed'], true)) {
            return;
        }

        $payment->update([
            'status' => 'failed',
            'payment_id' => $paymongoPaymentId ?? $payment->payment_id,
            'payment_intent_id' => $paymentIntentId ?? $payment->payment_intent_id,
            'metadata' => $metadata,
        ]);

        $payment->order?->orderDetail?->update(['payment_status' => 'failed']);

        $order = $payment->order;
        $orderDetail = $order?->orderDetail;
        if ($order && $orderDetail) {
            Notification::createForUser(
                $order->user_id,
                'payment_failed',
                'Payment Failed',
                "Your payment for order {$orderDetail->order_code} was not completed. You can retry from your order details.",
                Notification::CATEGORY_PAYMENT,
                $order,
                [
                    'order_id' => $order->id,
                    'order_code' => $orderDetail->order_code,
                    'amount' => $payment->amount,
                ],
                "/orders/{$order->id}"
            );
        }
    }

    private function resolvePaymentFromCheckoutSession(array $data): ?Payment
    {
        $sessionId = $data['id'] ?? null;

        if (! $sessionId) {
            Log::warning('PayMongo webhook: checkout session event missing session id', [
                'data' => $data,
            ]);

            return null;
        }

        $payment = Payment::with('order.orderDetail')
            ->where('checkout_session_id', $sessionId)
            ->first();

        if (! $payment) {
            Log::warning('PayMongo webhook: no payment found for checkout session', [
                'checkout_session_id' => $sessionId,
            ]);
        }

        return $payment;
    }

    private function resolvePaymentFromPaymongoPayment(array $data): ?Payment
    {
        $paymongoPaymentId = $data['id'] ?? null;
        $attrs = $data['attributes'] ?? [];
        $paymentIntentId = $attrs['payment_intent_id'] ?? null;

        if ($paymongoPaymentId) {
            $payment = Payment::with('order.orderDetail')
                ->where('payment_id', $paymongoPaymentId)
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        if ($paymentIntentId) {
            $payment = Payment::with('order.orderDetail')
                ->where('payment_intent_id', $paymentIntentId)
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        Log::warning('PayMongo webhook: no payment found for PayMongo payment resource', [
            'payment_id' => $paymongoPaymentId,
            'payment_intent_id' => $paymentIntentId,
        ]);

        return null;
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

    /**
     * Check whether an order's payment has been completed.
     *
     * @param int $orderId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPaymentStatusByOrderId($orderId)
    {
        $order = Order::with(['orderDetail', 'payment'])->find($orderId);

        if (! $order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }

        $paymentStatus = $order->orderDetail?->payment_status ?? 'pending';

        return response()->json([
            'success' => true,
            'order_id' => $order->id,
            'is_paid' => $paymentStatus === 'paid',
            'payment_status' => $paymentStatus,
            'payment' => $order->payment ? [
                'id' => $order->payment->id,
                'status' => $order->payment->status,
                'payment_method' => $order->payment->payment_method,
                'amount' => $order->payment->amount,
            ] : null,
        ]);
    }
}