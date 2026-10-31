<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class PaymentSecurityService
{
    public function isCod(OrderDetail $detail): bool
    {
        if ($detail->checkout_is_cod !== null) {
            return (bool) $detail->checkout_is_cod;
        }
        // Legacy data is frozen by the deployment migration; this also supports imports.
        $method = (string) $detail->payment_method;
        if (ctype_digit($method)) {
            $method = (string) DB::table('payment_methods')->where('id', $method)->value('name');
        }

        return strtolower(trim($method)) === 'cod';
    }

    public function review(string $reason, ?int $orderId = null, ?int $paymentId = null, ?int $shopId = null, array $details = []): void
    {
        DB::table('payment_reviews')->insertOrIgnore([
            'fingerprint' => hash('sha256', json_encode([$reason, $orderId, $paymentId, $shopId, $details])),
            'order_id' => $orderId, 'payment_id' => $paymentId, 'shop_id' => $shopId,
            'reason' => $reason, 'details' => json_encode($details), 'created_at' => now(), 'updated_at' => now(),
        ]);
        Log::warning('Payment requires review.', compact('reason', 'orderId', 'paymentId', 'shopId'));
    }

    public function held(?int $orderId): bool
    {
        return $orderId && DB::table('payment_reviews')->where('order_id', $orderId)->whereNull('resolved_at')->exists();
    }

    /** Derive the obligation from purchase snapshots, never a caller-editable total. */
    public function expected(Order $order): ?int
    {
        $detail = $order->orderDetail;
        if (! $detail) {
            return null;
        }
        $items = $order->orderItems()->get();
        if ($items->isEmpty()) {
            return null;
        }
        $subtotal = $items->sum(fn ($item) => FarmCheckoutService::cents($item->price_at_purchase) * (int) $item->quantity);
        $snapshot = $detail->payment_snapshot;
        // Legacy fee components are the server's stored purchase-time fee calculation.
        $fees = $snapshot['fees_minor'] ?? (
            FarmCheckoutService::cents($detail->delivery_base_fee) + FarmCheckoutService::cents($detail->delivery_km_fee)
            + FarmCheckoutService::cents($detail->heavy_surcharge) + FarmCheckoutService::cents($detail->multi_store_fee)
            + FarmCheckoutService::cents($detail->mov_penalty_fee)
        );
        $total = max(0, $subtotal + $fees - FarmCheckoutService::cents($detail->voucher_discount_amount));
        if ($subtotal !== FarmCheckoutService::cents($detail->subtotal)
            || ($snapshot && $subtotal !== ($snapshot['subtotal_minor'] ?? null))
            || $total !== FarmCheckoutService::cents($detail->total_amount)) {
            return null;
        }

        return $total;
    }

    public function canFulfill(Order $order): bool
    {
        if (! $order->orderDetail) {
            return false;
        }
        if ($this->isCod($order->orderDetail)) {
            return true;
        }
        if ($this->held($order->id) || $order->orderDetail->payment_status !== 'paid') {
            return false;
        }
        $expected = $this->expected($order);

        $received = (int) DB::table('payment_receipts')->where('order_id', $order->id)
            ->where('status', 'verified')->where('currency', 'PHP')->sum('amount_minor');

        if ($expected !== null && $received === $expected) {
            return true;
        }

        // Orders marked paid before provider receipts existed have no payment
        // attempt to reconcile. A live checkout always inserts a payments row.
        if ($expected === null || $received !== 0 || ! Schema::hasTable('payments')) {
            return false;
        }

        return ! DB::table('payments')->where('order_id', $order->id)->exists();
    }

    /** Caller holds the order/payment locks. Each actual provider receipt is durable. */
    public function receipt(?Payment $payment, array $resource, bool $linked, ?int $expected, bool $duplicate = false): bool
    {
        $id = $resource['id'] ?? null;
        $attrs = $resource['attributes'] ?? [];
        if (! is_string($id) || ! str_starts_with($id, 'pay_')) {
            $this->review('missing_provider_receipt', $payment?->order_id, $payment?->id);

            return false;
        }
        $amount = $attrs['amount'] ?? null;
        $validAmount = (is_int($amount) || (is_string($amount) && ctype_digit($amount))) && $amount >= 0;
        $reason = match (true) {
            ! $payment || ! $linked => 'unlinked_receipt',
            ($attrs['status'] ?? null) !== 'paid' => 'unsuccessful_receipt',
            ! $validAmount || $expected === null || (int) $amount !== $expected => 'amount_mismatch',
            ($attrs['currency'] ?? null) !== 'PHP' => 'currency_mismatch',
            $duplicate => 'additional_receipt',
            default => null,
        };
        $inserted = DB::table('payment_receipts')->insertOrIgnore([
            'provider_payment_id' => $id, 'payment_id' => $payment?->id, 'order_id' => $payment?->order_id,
            'amount_minor' => $validAmount ? (int) $amount : null, 'currency' => substr((string) ($attrs['currency'] ?? ''), 0, 10),
            'status' => $reason ? 'review' : 'verified', 'reason' => $reason,
            'payload' => json_encode($resource), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $existing = DB::table('payment_receipts')->where('provider_payment_id', $id)->first();
        if (! $inserted) {
            if ((int) $existing->payment_id !== (int) $payment?->id) {
                $this->review('receipt_reused', $payment?->order_id, $payment?->id, details: ['receipt_id' => $id]);
            }

            return false;
        }
        if ($reason) {
            $this->review($reason, $payment?->order_id, $payment?->id, details: ['receipt_id' => $id]);
        }

        return $reason === null;
    }
}
