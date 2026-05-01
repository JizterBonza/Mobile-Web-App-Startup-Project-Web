<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Payment;
use App\Models\PaymentWebhookEvent;
use App\Services\PaymongoService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    private const WEBHOOK_PROVIDER = 'paymongo';
    private const KNOWN_EVENT_TYPES = [
        'checkout_session.payment.paid',
        'checkout_session.payment.failed',
        'checkout_session.payment.expired',
        'checkout_session.expired',
        'checkout_session.payment.cancelled',
        'checkout_session.cancelled',
        'payment.paid',
        'payment.failed',
    ];

    protected PaymongoService $paymongo;

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
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $validator = Validator::make($request->all(), [
            'order_id' => 'required|integer|exists:orders,id',
            'payment_method' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $order = Order::with(['orderDetail', 'payment'])
            ->where('id', $validated['order_id'])
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        if (!$order->orderDetail) {
            return response()->json(['message' => 'Order detail record not found.'], 422);
        }

        $currentStatus = Payment::normalizeStatus($order->orderDetail->payment_status);
        if ($currentStatus === Payment::STATUS_PAID) {
            return response()->json([
                'message' => 'Order is already paid.',
                'order_id' => $order->id,
            ], 409);
        }

        $existingPending = Payment::where('order_id', $order->id)
            ->where('status', Payment::STATUS_PENDING)
            ->whereNotNull('checkout_url')
            ->latest('id')
            ->first();

        if ($existingPending) {
            return response()->json([
                'checkout_url' => $existingPending->checkout_url,
                'order_id' => $order->id,
                'payment_reference' => $existingPending->checkout_session_id ?: ('PAY-' . $existingPending->id),
            ]);
        }

        $session = $this->paymongo->createCheckoutSessionForOrder($order, $validated['payment_method'] ?? null);
        if (!empty($session['errors'])) {
            Log::error('payment.checkout.create_failed', [
                'order_id' => $order->id,
                'response' => $this->maskSensitiveData($session),
            ]);

            return response()->json([
                'message' => 'Failed to create checkout session.',
            ], 502);
        }

        $sessionId = Arr::get($session, 'data.id');
        $checkoutUrl = Arr::get($session, 'data.attributes.checkout_url');
        $paymentIntentId = Arr::get($session, 'data.attributes.payment_intent_id');
        $paymentReference = Arr::get($session, 'data.attributes.reference_number') ?: ($sessionId ?: null);

        if (!$sessionId || !$checkoutUrl) {
            Log::error('payment.checkout.invalid_response', [
                'order_id' => $order->id,
                'response' => $this->maskSensitiveData($session),
            ]);

            return response()->json([
                'message' => 'Invalid checkout session response.',
            ], 502);
        }

        $payment = Payment::create([
            'order_id' => $order->id,
            'provider' => self::WEBHOOK_PROVIDER,
            'checkout_session_id' => $sessionId,
            'payment_intent_id' => $paymentIntentId,
            'checkout_url' => $checkoutUrl,
            'amount' => $order->orderDetail->total_amount,
            'currency' => 'PHP',
            'status' => Payment::STATUS_PENDING,
            'metadata' => $session,
            'raw_payload' => $session,
        ]);

        $order->orderDetail->update([
            'payment_status' => Payment::STATUS_PENDING,
        ]);

        Log::info('payment.checkout.created', [
            'order_id' => $order->id,
            'payment_id' => $payment->id,
            'checkout_session_id' => $payment->checkout_session_id,
        ]);

        return response()->json([
            'checkout_url' => $checkoutUrl,
            'order_id' => $order->id,
            'payment_reference' => $paymentReference ?: ('PAY-' . $payment->id),
        ]);
    }

    public function handleWebhook(Request $request): JsonResponse
    {
        return $this->handlePaymongoWebhook($request);
    }

    public function handlePaymongoWebhook(Request $request): JsonResponse
    {
        $rawBody = $request->getContent();
        $signatureHeader = $request->header('Paymongo-Signature');

        if (!$this->paymongo->verifyWebhookSignature($rawBody, $signatureHeader)) {
            Log::warning('payment.webhook.signature_failed', [
                'signature_header_present' => !empty($signatureHeader),
            ]);

            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $payload = json_decode($rawBody, true);
        if (!is_array($payload)) {
            return response()->json(['error' => 'Invalid webhook payload'], 400);
        }

        $eventId = (string) ($payload['data']['id'] ?? hash('sha256', $rawBody));
        $eventType = Arr::get($payload, 'data.attributes.type');
        $resource = Arr::get($payload, 'data.attributes.data', []);
        $status = $this->paymongo->mapEventToCanonicalStatus($eventType);

        $duplicateEvent = false;
        try {
            DB::transaction(function () use (
                $eventId,
                $eventType,
                $payload,
                $resource,
                $status,
                &$duplicateEvent
            ) {
                $existingEvent = PaymentWebhookEvent::where('provider', self::WEBHOOK_PROVIDER)
                    ->where('event_id', $eventId)
                    ->lockForUpdate()
                    ->first();

                if ($existingEvent) {
                    $duplicateEvent = true;
                    return;
                }

                $event = PaymentWebhookEvent::create([
                    'provider' => self::WEBHOOK_PROVIDER,
                    'event_id' => $eventId,
                    'event_type' => $eventType,
                    'payload' => $payload,
                    'processed_at' => null,
                ]);

                if (!in_array($eventType, self::KNOWN_EVENT_TYPES, true)) {
                    Log::warning('payment.webhook.unknown_event', [
                        'event_id' => $eventId,
                        'event_type' => $eventType,
                    ]);

                    $event->update(['processed_at' => now()]);
                    return;
                }

                $identifiers = $this->extractPaymentIdentifiers($resource);
                $payment = Payment::query()
                    ->where(function ($query) use ($identifiers) {
                        if ($identifiers['checkout_session_id']) {
                            $query->orWhere('checkout_session_id', $identifiers['checkout_session_id']);
                        }
                        if ($identifiers['payment_intent_id']) {
                            $query->orWhere('payment_intent_id', $identifiers['payment_intent_id']);
                        }
                    })
                    ->lockForUpdate()
                    ->latest('id')
                    ->first();

                if (!$payment) {
                    Log::warning('payment.webhook.payment_not_found', [
                        'event_id' => $eventId,
                        'event_type' => $eventType,
                        'identifiers' => $identifiers,
                    ]);

                    $event->update(['processed_at' => now()]);
                    return;
                }

                $payment->status = Payment::normalizeStatus($status);
                if ($payment->status === Payment::STATUS_PAID && !$payment->paid_at) {
                    $payment->paid_at = now();
                }
                if (!$payment->checkout_session_id && $identifiers['checkout_session_id']) {
                    $payment->checkout_session_id = $identifiers['checkout_session_id'];
                }
                if (!$payment->payment_intent_id && $identifiers['payment_intent_id']) {
                    $payment->payment_intent_id = $identifiers['payment_intent_id'];
                }
                if (!$payment->payment_id && $identifiers['payment_id']) {
                    $payment->payment_id = $identifiers['payment_id'];
                }
                if ($identifiers['payment_method']) {
                    $payment->payment_method = $identifiers['payment_method'];
                }

                $payment->metadata = $payload;
                $payment->raw_payload = $payload;
                $payment->save();

                $payment->loadMissing('order.orderDetail');
                if ($payment->order?->orderDetail) {
                    DB::table('order_details')
                        ->where('id', $payment->order->orderDetail->id)
                        ->update([
                            'payment_status' => $payment->status,
                            'updated_at' => now(),
                        ]);
                }

                $event->update(['processed_at' => now()]);
            });
        } catch (QueryException $exception) {
            if ((int) $exception->getCode() === 23000) {
                $duplicateEvent = true;
            } else {
                throw $exception;
            }
        }

        if ($duplicateEvent) {
            Log::info('payment.webhook.duplicate_event', [
                'event_id' => $eventId,
                'event_type' => $eventType,
            ]);

            return response()->json(['received' => true, 'duplicate' => true]);
        }

        return response()->json(['received' => true]);
    }

    public function status(Request $request, int $orderId): JsonResponse
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $order = Order::with(['orderDetail', 'payment'])
            ->where('id', $orderId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found.'], 404);
        }

        $status = Payment::normalizeStatus(
            $order->orderDetail?->payment_status
            ?? $order->payment?->status
            ?? Payment::STATUS_PENDING
        );
        $updatedAt = $order->payment?->updated_at
            ?? $order->orderDetail?->updated_at
            ?? $order->updated_at;

        return response()->json([
            'order_id' => $order->id,
            'payment_status' => $status,
            'updated_at' => optional($updatedAt)->toISOString(),
            'is_final' => $this->isFinalStatus($status),
        ]);
    }

    private function isFinalStatus(string $status): bool
    {
        return in_array($status, [
            Payment::STATUS_PAID,
            Payment::STATUS_FAILED,
            Payment::STATUS_EXPIRED,
            Payment::STATUS_CANCELLED,
        ], true);
    }

    private function extractPaymentIdentifiers(array $resource): array
    {
        $resourceAttrs = Arr::get($resource, 'attributes', []);
        $checkoutSessionId = $resource['id'] ?? Arr::get($resourceAttrs, 'checkout_session_id');
        $paymentItems = Arr::get($resourceAttrs, 'payments', []);
        $firstPayment = (is_array($paymentItems) && !empty($paymentItems) && is_array($paymentItems[0]))
            ? $paymentItems[0]
            : [];

        return [
            'checkout_session_id' => $checkoutSessionId,
            'payment_intent_id' => Arr::get($firstPayment, 'attributes.payment_intent_id')
                ?? Arr::get($resourceAttrs, 'payment_intent_id'),
            'payment_id' => Arr::get($firstPayment, 'id')
                ?? Arr::get($resourceAttrs, 'payment_id'),
            'payment_method' => Arr::get($firstPayment, 'attributes.source.type')
                ?? Arr::get($firstPayment, 'attributes.payment_method_used'),
        ];
    }

    private function maskSensitiveData(array $payload): array
    {
        $sensitiveKeys = ['secret', 'token', 'password', 'authorization', 'email', 'phone'];
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