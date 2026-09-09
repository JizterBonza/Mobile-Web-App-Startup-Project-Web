<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Payment;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentStatusService
{
    public const RESULT_PAID = 'paid';

    public const RESULT_PENDING = 'pending';

    public const RESULT_FAILED = 'failed';

    public const RESULT_UNAVAILABLE = 'unavailable';

    public function __construct(
        private readonly PaymongoService $paymongo,
        private readonly VoucherService $voucherService,
    ) {}

    /**
     * Reconcile a pending local payment with its PayMongo checkout session.
     */
    public function syncPendingFromPaymongo(?Payment $payment): string
    {
        if (! $payment) {
            return self::RESULT_UNAVAILABLE;
        }

        $payment->refresh();
        $payment->loadMissing('order.orderDetail');

        if ($payment->status === 'paid'
            || $payment->order?->orderDetail?->payment_status === 'paid'
        ) {
            return self::RESULT_PAID;
        }

        if ($payment->status === 'failed'
            || $payment->order?->orderDetail?->payment_status === 'failed'
        ) {
            return self::RESULT_FAILED;
        }

        if (empty($payment->checkout_session_id)) {
            Log::warning('PayMongo sync: payment has no checkout session.', [
                'payment_id' => $payment->id,
            ]);

            return self::RESULT_UNAVAILABLE;
        }

        try {
            $session = $this->paymongo->retrieveCheckoutSession($payment->checkout_session_id);
        } catch (\Throwable $e) {
            Log::warning('PayMongo sync: checkout session request failed.', [
                'payment_id' => $payment->id,
                'checkout_session_id' => $payment->checkout_session_id,
                'error' => $e->getMessage(),
            ]);

            return self::RESULT_UNAVAILABLE;
        }

        if (! is_array($session) || empty($session['data'])) {
            Log::warning('PayMongo sync: unable to retrieve checkout session.', [
                'payment_id' => $payment->id,
                'checkout_session_id' => $payment->checkout_session_id,
                'response' => $session,
            ]);

            return self::RESULT_UNAVAILABLE;
        }

        $data = $session['data'];
        $attrs = $data['attributes'] ?? [];
        $payments = $attrs['payments'] ?? [];
        $paymongoPayment = null;

        if (is_array($payments)) {
            foreach ($payments as $candidate) {
                if (($candidate['attributes']['status'] ?? null) === 'paid') {
                    $paymongoPayment = $candidate;
                    break;
                }
            }
        }

        $isPaid = $paymongoPayment !== null || ! empty($attrs['paid_at']);
        if (! $isPaid) {
            return self::RESULT_PENDING;
        }

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

        Log::info('PayMongo sync: marking local payment paid from checkout session.', [
            'payment_id' => $payment->id,
            'checkout_session_id' => $payment->checkout_session_id,
            'session_status' => $attrs['status'] ?? null,
            'paid_at' => $attrs['paid_at'] ?? null,
        ]);

        $this->markPaid(
            $payment,
            $paymongoPayment['id'] ?? null,
            $paymentMethod,
            $data,
            $paymentIntentId,
        );

        return self::RESULT_PAID;
    }

    /**
     * Atomically mark a payment paid and emit its confirmation once.
     */
    public function markPaid(
        Payment $payment,
        ?string $paymongoPaymentId,
        ?string $paymentMethod,
        array $metadata,
        ?string $paymentIntentId = null,
    ): bool {
        return DB::transaction(function () use (
            $payment,
            $paymongoPaymentId,
            $paymentMethod,
            $metadata,
            $paymentIntentId,
        ) {
            $lockedPayment = Payment::query()->lockForUpdate()->find($payment->id);
            if (! $lockedPayment) {
                return false;
            }

            $order = Order::query()->find($lockedPayment->order_id);
            $orderDetail = $order
                ? OrderDetail::query()->lockForUpdate()->find($order->order_detail_id)
                : null;

            if ($lockedPayment->status === 'paid' || $orderDetail?->payment_status === 'paid') {
                return false;
            }

            $resolvedPaymentMethod = $paymentMethod ?? $lockedPayment->payment_method;
            $sessionIdFromPayload = $metadata['id'] ?? null;
            $update = [
                'status' => 'paid',
                'payment_method' => $resolvedPaymentMethod,
                'payment_id' => $paymongoPaymentId ?? $lockedPayment->payment_id,
                'payment_intent_id' => $paymentIntentId ?? $lockedPayment->payment_intent_id,
                'metadata' => $metadata,
            ];

            if (is_string($sessionIdFromPayload) && str_starts_with($sessionIdFromPayload, 'cs_')) {
                $update['checkout_session_id'] = $sessionIdFromPayload;
            }

            $lockedPayment->update($update);

            if (! $order || ! $orderDetail) {
                return true;
            }

            $orderDetail->update(['payment_status' => 'paid']);
            $this->recordVoucherUsageIfNeeded($order, $orderDetail);

            Notification::query()->firstOrCreate(
                [
                    'user_id' => $order->user_id,
                    'type' => 'payment_confirmed',
                    'reference_type' => Order::class,
                    'reference_id' => $order->id,
                ],
                [
                    'category' => Notification::CATEGORY_PAYMENT,
                    'title' => 'Payment Confirmed',
                    'message' => "Your payment for order {$orderDetail->order_code} has been confirmed. Amount: ₱".number_format((float) $lockedPayment->amount, 2),
                    'data' => [
                        'order_id' => $order->id,
                        'order_code' => $orderDetail->order_code,
                        'amount' => $lockedPayment->amount,
                        'payment_method' => $resolvedPaymentMethod,
                    ],
                    'action_url' => "/orders/{$order->id}",
                ],
            );

            return true;
        });
    }

    private function recordVoucherUsageIfNeeded(Order $order, OrderDetail $orderDetail): void
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
}
