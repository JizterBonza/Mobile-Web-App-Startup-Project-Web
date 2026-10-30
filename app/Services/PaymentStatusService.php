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

    public function __construct(private readonly PaymongoService $paymongo, private readonly VoucherService $voucherService) {}

    public function syncPendingFromPaymongo(?Payment $payment, bool $force = false): string
    {
        if (! $payment) {
            return self::RESULT_UNAVAILABLE;
        }
        if (app(FarmPaymentService::class)->supports($payment)) {
            return app(FarmPaymentService::class)->reconcile($payment, $force);
        }
        $payment->refresh();
        if (! $force && $payment->status === 'paid') {
            return self::RESULT_PAID;
        }
        if (! $payment->checkout_session_id && ! $payment->payment_intent_id) {
            return self::RESULT_UNAVAILABLE;
        }
        if (! $this->claimPoll($payment, $force)) {
            return $payment->status === 'paid' ? self::RESULT_PAID : self::RESULT_UNAVAILABLE;
        }
        try {
            $response = $payment->checkout_session_id
                ? $this->paymongo->retrieveCheckoutSession($payment->checkout_session_id)
                : $this->paymongo->retrievePaymentIntent($payment->payment_intent_id);
        } catch (\Throwable $e) {
            Log::warning('Payment reconciliation unavailable.', ['payment_id' => $payment->id]);

            return self::RESULT_UNAVAILABLE;
        }
        $data = $response['data'] ?? null;
        if (! is_array($data) || ($data['id'] ?? null) !== ($payment->checkout_session_id ?: $payment->payment_intent_id)) {
            return self::RESULT_UNAVAILABLE;
        }
        $paid = collect($data['attributes']['payments'] ?? [])->filter(fn ($p) => ($p['attributes']['status'] ?? null) === 'paid');
        foreach ($paid as $resource) {
            $payload = $payment->checkout_session_id ? $data : $resource;
            $payload['attributes']['payment_intent_id'] ??= $payment->payment_intent_id;
            $this->markPaid($payment, $resource['id'] ?? null, $resource['attributes']['source']['type'] ?? null,
                $payload, $resource['attributes']['payment_intent_id'] ?? $data['attributes']['payment_intent']['id'] ?? $payment->payment_intent_id);
        }
        $payment->refresh();
        if ($payment->status === 'paid') {
            return self::RESULT_PAID;
        }
        if (($data['attributes']['status'] ?? null) === 'expired') {
            DB::transaction(function () use ($payment) {
                if ($payment->order_id) {
                    $order = Order::whereKey($payment->order_id)->lockForUpdate()->firstOrFail();
                    OrderDetail::whereKey($order->order_detail_id)->lockForUpdate()->firstOrFail();
                }
                $locked = Payment::lockForUpdate()->findOrFail($payment->id);
                if ($locked->status !== 'paid') {
                    $locked->update(['status' => 'expired']);
                }
            }, 3);

            return self::RESULT_FAILED;
        }
        if ($paid->isNotEmpty() || ! empty($data['attributes']['paid_at'])) {
            return self::RESULT_UNAVAILABLE;
        }

        return self::RESULT_PENDING;
    }

    public function claimPoll(Payment $payment, bool $force = false): bool
    {
        $query = Payment::whereKey($payment->id);
        if (! $force) {
            $query->where(fn ($q) => $q->whereNull('last_reconciled_at')->orWhere('last_reconciled_at', '<=', now()->subSeconds((int) config('services.paymongo.reconciliation_cooldown', 10))));
        }

        $updated = $query->update(['last_reconciled_at' => now()]);

        // MySQL reports zero changed rows when a forced poll uses the same timestamp.
        return $force || $updated === 1;
    }

    public function markPaid(Payment $payment, ?string $paymongoPaymentId, ?string $paymentMethod, array $metadata, ?string $paymentIntentId = null): bool
    {
        if (app(FarmPaymentService::class)->supports($payment)) {
            return app(FarmPaymentService::class)->markPaid($payment, $paymongoPaymentId, $paymentMethod, $metadata, $paymentIntentId);
        }

        return DB::transaction(function () use ($payment, $paymongoPaymentId, $paymentMethod, $metadata, $paymentIntentId) {
            $order = $payment->order_id ? Order::lockForUpdate()->findOrFail($payment->order_id) : null;
            $detail = $order ? OrderDetail::lockForUpdate()->findOrFail($order->order_detail_id) : null;
            $locked = Payment::lockForUpdate()->findOrFail($payment->id);
            $security = app(PaymentSecurityService::class);
            $checkout = str_starts_with($metadata['id'] ?? '', 'cs_');
            $resource = $checkout ? collect($metadata['attributes']['payments'] ?? [])->firstWhere('id', $paymongoPaymentId) : $metadata;
            $resource ??= [];
            $attempt = $metadata['attributes']['metadata']['payment_attempt_key'] ?? null;
            $byAttempt = is_string($attempt) && $locked->attempt_key && hash_equals($locked->attempt_key, $attempt);
            $linked = $checkout
                ? (($locked->checkout_session_id && $locked->checkout_session_id === ($metadata['id'] ?? null)) || (! $locked->checkout_session_id && $byAttempt))
                : (($paymentIntentId && $locked->payment_intent_id === $paymentIntentId) || ($paymongoPaymentId && $locked->payment_id === $paymongoPaymentId) || $byAttempt);
            if ($order) {
                $order->setRelation('orderDetail', $detail);
                $linked = $linked && (int) $locked->owner_user_id === (int) $order->user_id;
            }
            $expected = $order ? $security->expected($order) : FarmCheckoutService::cents($locked->amount);
            $matchesAttempt = $expected === FarmCheckoutService::cents($locked->amount) && $locked->currency === 'PHP';
            $duplicate = ($locked->status === 'paid' && $locked->payment_id && $locked->payment_id !== $paymongoPaymentId)
                || ($detail?->payment_status === 'paid' && $locked->status !== 'paid');
            if (! $security->receipt($locked, $resource, $linked && $matchesAttempt, $expected, $duplicate)) {
                return false;
            }
            if ($locked->status === 'paid') {
                $locked->update(['payment_id' => $locked->payment_id ?? $paymongoPaymentId,
                    'payment_intent_id' => $locked->payment_intent_id ?? $paymentIntentId]);

                return false;
            }
            $locked->update([
                'status' => 'paid', 'payment_id' => $paymongoPaymentId, 'payment_intent_id' => $paymentIntentId ?? $locked->payment_intent_id,
                'checkout_session_id' => $checkout ? $metadata['id'] : $locked->checkout_session_id,
                'payment_method' => $paymentMethod ?? $locked->payment_method,
                'metadata' => array_merge($locked->metadata ?? [], ['provider_payload' => $metadata]),
            ]);
            // A late callback can recover a previously unknown creation result.
            DB::table('payment_reviews')->where('payment_id', $locked->id)->where('reason', 'creation_unknown')
                ->whereNull('resolved_at')->update(['resolved_at' => now(), 'updated_at' => now()]);
            if (! $order || ! $detail) {
                return true;
            }
            if ($security->held($order->id)) {
                return true; // Receipt is real; an unresolved order hold still prevents fulfillment.
            }
            $detail->update(['payment_status' => 'paid']);
            $this->recordVoucherUsageIfNeeded($order, $detail);
            Notification::query()->firstOrCreate(
                ['user_id' => $order->user_id, 'type' => 'payment_confirmed', 'reference_type' => Order::class, 'reference_id' => $order->id],
                ['category' => Notification::CATEGORY_PAYMENT, 'title' => 'Payment Confirmed',
                    'message' => "Your payment for order {$detail->order_code} has been confirmed.",
                    'data' => ['order_id' => $order->id, 'order_code' => $detail->order_code, 'amount' => $locked->amount, 'payment_method' => $locked->payment_method],
                    'action_url' => "/orders/{$order->id}"]);

            return true;
        }, 3);
    }

    public function markFailed(Payment $payment, array $payload): void
    {
        if (app(FarmPaymentService::class)->supports($payment)) {
            app(FarmPaymentService::class)->failed($payment, $payload);

            return;
        }
        DB::transaction(function () use ($payment, $payload) {
            if ($payment->order_id) {
                $order = Order::lockForUpdate()->findOrFail($payment->order_id);
                $detail = OrderDetail::lockForUpdate()->findOrFail($order->order_detail_id);
            }
            $locked = Payment::lockForUpdate()->findOrFail($payment->id);
            if ($locked->status === 'paid' || ($detail->payment_status ?? null) === 'paid') {
                return;
            }
            // A failed payment attempt does not terminate a reusable hosted checkout.
            $locked->update(['metadata' => array_merge($locked->metadata ?? [], ['last_failed_attempt' => $payload])]);
        }, 3);
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
