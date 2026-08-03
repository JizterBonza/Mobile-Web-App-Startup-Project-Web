<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Services\PaymongoService;
use App\Services\VoucherService;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Notification;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    use EnsuresApiOwnership;

    protected $paymongo;

    protected VoucherService $voucherService;

    public function __construct(PaymongoService $paymongo, VoucherService $voucherService)
    {
        $this->paymongo = $paymongo;
        $this->voucherService = $voucherService;
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
        $orderId = $request->query('order_id') ?? $request->input('order_id');
        $paymentIntentId = $request->query('payment_intent_id') ?? $request->input('payment_intent_id');

        // Prefer syncing by order when returning from hosted checkout.
        if (! empty($orderId)) {
            $payment = Payment::with('order.orderDetail')
                ->where('order_id', $orderId)
                ->latest('id')
                ->first();

            if ($payment) {
                $this->syncPendingPaymentFromPaymongo($payment);
                $payment->refresh();
                $payment->load('order.orderDetail');

                $paymentStatus = $payment->order?->orderDetail?->payment_status
                    ?? $payment->status
                    ?? 'pending';

                return response()->json([
                    'success' => $paymentStatus === 'paid',
                    'message' => $paymentStatus === 'paid'
                        ? 'Payment successful'
                        : 'Payment received. Your order will be updated shortly.',
                    'order_id' => (int) $orderId,
                    'payment_status' => $paymentStatus,
                    'is_paid' => $paymentStatus === 'paid',
                ]);
            }
        }

        // Checkout sessions redirect here without a payment_intent_id; payment
        // confirmation is handled by the PayMongo webhook / sync above.
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

    /**
     * PayMongo cancel_url landing page.
     * Do NOT cancel the order here — user may have completed payment in the wallet app.
     * Sync from PayMongo first; only report cancelled when still unpaid.
     */
    public function paymentCancel(Request $request)
    {
        $orderId = $request->query('order_id') ?? $request->input('order_id');

        if (empty($orderId)) {
            return response()->json([
                'success' => false,
                'message' => 'Payment was cancelled.',
                'payment_status' => 'cancelled',
                'is_paid' => false,
            ]);
        }

        $payment = Payment::with('order.orderDetail')
            ->where('order_id', $orderId)
            ->latest('id')
            ->first();

        if ($payment) {
            $this->syncPendingPaymentFromPaymongo($payment);
            $payment->refresh();
            $payment->load('order.orderDetail');
        }

        $paymentStatus = $payment?->order?->orderDetail?->payment_status
            ?? $payment?->status
            ?? 'pending';

        if ($paymentStatus === 'paid') {
            return response()->json([
                'success' => true,
                'message' => 'Payment successful',
                'order_id' => (int) $orderId,
                'payment_status' => 'paid',
                'is_paid' => true,
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Payment was not completed.',
            'order_id' => (int) $orderId,
            'payment_status' => $paymentStatus,
            'is_paid' => false,
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
        if ($payment->status === 'paid') {
            return;
        }

        // If this webhook is for an older rotated session, still mark paid and
        // restore the session id that actually completed payment when present.
        $sessionIdFromPayload = $metadata['id'] ?? null;
        $update = [
            'status' => 'paid',
            'payment_method' => $paymentMethod,
            'payment_id' => $paymongoPaymentId ?? $payment->payment_id,
            'payment_intent_id' => $paymentIntentId ?? $payment->payment_intent_id,
            'metadata' => $metadata,
        ];

        if (is_string($sessionIdFromPayload) && str_starts_with($sessionIdFromPayload, 'cs_')) {
            $update['checkout_session_id'] = $sessionIdFromPayload;
        }

        $payment->update($update);

        $payment->order?->orderDetail?->update(['payment_status' => 'paid']);

        $order = $payment->order;
        $orderDetail = $order?->orderDetail;
        if ($order && $orderDetail) {
            $this->recordVoucherUsageIfNeeded($order, $orderDetail);

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

    private function recordVoucherUsageIfNeeded(Order $order, $orderDetail): void
    {
        if (! $orderDetail->voucher_id) {
            return;
        }

        $alreadyRecorded = VoucherUsage::query()
            ->where('order_id', $order->id)
            ->where('voucher_id', $orderDetail->voucher_id)
            ->exists();

        if ($alreadyRecorded) {
            return;
        }

        $voucher = Voucher::query()->find($orderDetail->voucher_id);
        if (! $voucher) {
            return;
        }

        $this->voucherService->recordUsage(
            $voucher,
            (int) $order->user_id,
            (int) $order->id,
            (float) $orderDetail->voucher_discount_amount,
        );
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
        $attrs = $data['attributes'] ?? [];
        $referenceNumber = $attrs['reference_number'] ?? null;
        $metadataOrderId = $attrs['metadata']['order_id'] ?? null;

        if ($sessionId) {
            $payment = Payment::with('order.orderDetail')
                ->where('checkout_session_id', $sessionId)
                ->first();

            if ($payment) {
                return $payment;
            }

            // Session may have been rotated locally; check previous IDs.
            $payment = Payment::with('order.orderDetail')
                ->whereJsonContains('metadata->previous_checkout_session_ids', $sessionId)
                ->latest('id')
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        $orderId = is_numeric($referenceNumber)
            ? (int) $referenceNumber
            : (is_numeric($metadataOrderId) ? (int) $metadataOrderId : null);

        if ($orderId) {
            $paid = Payment::with('order.orderDetail')
                ->where('order_id', $orderId)
                ->where('status', 'paid')
                ->latest('id')
                ->first();

            if ($paid) {
                return $paid;
            }

            $payment = Payment::with('order.orderDetail')
                ->where('order_id', $orderId)
                ->latest('id')
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        Log::warning('PayMongo webhook: no payment found for checkout session', [
            'checkout_session_id' => $sessionId,
            'reference_number' => $referenceNumber,
            'metadata_order_id' => $metadataOrderId,
        ]);

        return null;
    }

    private function resolvePaymentFromPaymongoPayment(array $data): ?Payment
    {
        $paymongoPaymentId = $data['id'] ?? null;
        $attrs = $data['attributes'] ?? [];
        $paymentIntentId = $attrs['payment_intent_id'] ?? null;
        $metadataOrderId = $attrs['metadata']['order_id'] ?? null;

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

        if (is_numeric($metadataOrderId)) {
            $payment = Payment::with('order.orderDetail')
                ->where('order_id', (int) $metadataOrderId)
                ->latest('id')
                ->first();

            if ($payment) {
                return $payment;
            }
        }

        Log::warning('PayMongo webhook: no payment found for PayMongo payment resource', [
            'payment_id' => $paymongoPaymentId,
            'payment_intent_id' => $paymentIntentId,
            'metadata_order_id' => $metadataOrderId,
        ]);

        return null;
    }

    /**
     * Get checkout_url for an order by order_id.
     * Re-validates voucher before returning; recreates PayMongo session if amount changed.
     *
     * @param int $orderId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getCheckoutUrlByOrderId(Request $request, $orderId)
    {
        $order = Order::with(['orderDetail', 'orderShops'])->find($orderId);

        if (! $order || ! $order->orderDetail) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }

        if ($response = $this->forbidUnlessOrderAccess($request, $order)) {
            return $response;
        }

        $orderDetail = $order->orderDetail;

        if ($orderDetail->payment_status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'This order is already paid.',
            ], 400);
        }

        $finalize = $this->voucherService->finalizeForCheckout(
            $orderDetail,
            (int) $order->user_id,
        );
        $orderDetail->refresh();

        $payment = Payment::where('order_id', $order->id)->latest('id')->first();
        $needsNewSession = ! $payment
            || empty($payment->checkout_url)
            || $payment->status !== 'pending'
            || abs((float) $payment->amount - (float) $finalize['total_amount']) > 0.01
            || ! empty($finalize['stripped']);

        if ($needsNewSession) {
            $session = $this->paymongo->createCheckoutSession(
                $finalize['total_amount'],
                'Order '.$orderDetail->order_code,
                [
                    'reference_number' => (string) $order->id,
                    'metadata' => [
                        'order_id' => (string) $order->id,
                        'order_code' => (string) $orderDetail->order_code,
                    ],
                    'success_url' => config('app.url').'/api/payment-success?order_id='.$order->id,
                    'cancel_url' => config('app.url').'/api/payment-cancel?order_id='.$order->id,
                ],
            );

            if (! is_array($session) || ! empty($session['errors'])) {
                Log::error('PayMongo checkout session creation failed on refresh', [
                    'order_id' => $order->id,
                    'response' => $session,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Failed to create payment checkout session.',
                ], 500);
            }

            $sessionId = $session['data']['id'] ?? null;
            $checkoutUrl = $session['data']['attributes']['checkout_url'] ?? null;

            if (! $sessionId || ! $checkoutUrl) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid payment checkout response.',
                ], 500);
            }

            if ($payment && $payment->status === 'pending') {
                $metadata = is_array($payment->metadata) ? $payment->metadata : [];
                $previousIds = $metadata['previous_checkout_session_ids'] ?? [];
                if (! empty($payment->checkout_session_id)
                    && $payment->checkout_session_id !== $sessionId
                ) {
                    $previousIds[] = $payment->checkout_session_id;
                }

                $payment->update([
                    'checkout_session_id' => $sessionId,
                    'checkout_url' => $checkoutUrl,
                    'amount' => $finalize['total_amount'],
                    'status' => 'pending',
                    'metadata' => array_merge($metadata, [
                        'previous_checkout_session_ids' => array_values(array_unique($previousIds)),
                        'order_id' => (string) $order->id,
                        'order_code' => (string) $orderDetail->order_code,
                    ]),
                ]);
            } else {
                $payment = Payment::create([
                    'order_id' => $order->id,
                    'checkout_session_id' => $sessionId,
                    'checkout_url' => $checkoutUrl,
                    'amount' => $finalize['total_amount'],
                    'status' => 'pending',
                    'metadata' => [
                        'order_id' => (string) $order->id,
                        'order_code' => (string) $orderDetail->order_code,
                    ],
                ]);
            }
        }

        $payment = $payment->fresh();

        $response = [
            'success' => true,
            'checkout_url' => $payment->checkout_url,
            'total_amount' => $finalize['total_amount'],
            'session_id' => $payment->checkout_session_id,
        ];

        if (! empty($finalize['stripped'])) {
            $response['voucher_removed'] = true;
            $response['message'] = $finalize['message'] ?? 'Voucher expired; total updated.';
        }

        return response()->json($response);
    }

    /**
     * Check whether an order's payment has been completed.
     *
     * @param int $orderId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getPaymentStatusByOrderId(Request $request, $orderId)
    {
        $order = Order::with(['orderDetail', 'payment', 'orderShops'])->find($orderId);

        if (! $order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }

        if ($response = $this->forbidUnlessOrderAccess($request, $order)) {
            return $response;
        }

        // Localhost / missed webhooks: sync from PayMongo when still pending.
        $this->syncPendingPaymentFromPaymongo($order->payment);

        $order->refresh();
        $order->load(['orderDetail', 'payment']);

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

    /**
     * If a webhook never arrived (common on localhost), ask PayMongo for the
     * checkout session status and mark the local payment paid when appropriate.
     */
    private function syncPendingPaymentFromPaymongo(?Payment $payment): void
    {
        if (! $payment || $payment->status === 'paid' || empty($payment->checkout_session_id)) {
            return;
        }

        $session = $this->paymongo->retrieveCheckoutSession($payment->checkout_session_id);

        if (! is_array($session) || empty($session['data'])) {
            Log::warning('PayMongo sync: unable to retrieve checkout session', [
                'payment_id' => $payment->id,
                'checkout_session_id' => $payment->checkout_session_id,
                'response' => $session,
            ]);

            return;
        }

        $data = $session['data'];
        $attrs = $data['attributes'] ?? [];
        $payments = $attrs['payments'] ?? [];

        // Session status is only active/expired — paid is indicated by payments[].
        $paymongoPayment = null;
        if (is_array($payments)) {
            foreach ($payments as $candidate) {
                if (($candidate['attributes']['status'] ?? null) === 'paid') {
                    $paymongoPayment = $candidate;
                    break;
                }
            }
        }

        $isPaid = $paymongoPayment !== null
            || ! empty($attrs['paid_at']);

        if (! $isPaid) {
            return;
        }

        // If paid_at is set but payments list is empty/unpaid, still sync with whatever we have.
        if ($paymongoPayment === null && is_array($payments) && count($payments) > 0) {
            $paymongoPayment = $payments[0];
        }

        $paymentMethod = $paymongoPayment['attributes']['source']['type']
            ?? $paymongoPayment['attributes']['payment_method_used']
            ?? $attrs['payment_method_used']
            ?? null;

        $paymentIntentId = $attrs['payment_intent']['id']
            ?? $paymongoPayment['attributes']['payment_intent_id']
            ?? null;

        Log::info('PayMongo sync: marking local payment paid from checkout session', [
            'payment_id' => $payment->id,
            'checkout_session_id' => $payment->checkout_session_id,
            'session_status' => $attrs['status'] ?? null,
            'paid_at' => $attrs['paid_at'] ?? null,
        ]);

        $this->markPaymentPaid(
            $payment->fresh(['order.orderDetail']),
            $paymongoPayment['id'] ?? null,
            $paymentMethod,
            $data,
            $paymentIntentId
        );
    }
}