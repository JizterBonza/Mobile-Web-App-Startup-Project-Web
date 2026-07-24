<?php

namespace App\Services;

use App\Models\OrderDetail;
use App\Models\Voucher;
use App\Models\VoucherUsage;

class VoucherService
{
    /**
     * Validate and quote a voucher against a computed fee result.
     *
     * @param  array{subtotal?: float|int|string, shipping_fee?: float|int|string, total_amount?: float|int|string}  $feeResult
     * @return array{
     *     success: bool,
     *     message?: string,
     *     voucher?: Voucher|null,
     *     voucher_discount_amount: float,
     *     shipping_fee: float,
     *     total_amount: float,
     *     voucher_id: int|null,
     *     voucher_code: string|null
     * }
     */
    public function apply(?string $code, int $userId, float $subtotal, array $feeResult): array
    {
        $shippingFee = round((float) ($feeResult['shipping_fee'] ?? 0), 2);
        $baseTotal = round((float) ($feeResult['total_amount'] ?? 0), 2);

        if ($code === null || trim($code) === '') {
            return [
                'success' => true,
                'voucher' => null,
                'voucher_discount_amount' => 0.0,
                'shipping_fee' => $shippingFee,
                'total_amount' => $baseTotal,
                'voucher_id' => null,
                'voucher_code' => null,
            ];
        }

        $normalizedCode = strtoupper(trim($code));
        $voucher = Voucher::query()->where('code', $normalizedCode)->first();

        if (! $voucher) {
            return $this->failure('Invalid voucher code.');
        }

        $redeemable = $this->isStillRedeemable($voucher, $userId, $subtotal);
        if ($redeemable !== true) {
            return $this->failure(is_string($redeemable) ? $redeemable : 'This voucher cannot be used.');
        }

        $discountAmount = $this->computeDiscount($voucher, $subtotal, $shippingFee);
        $adjustedShippingFee = $shippingFee;

        if ($voucher->type === 'free_shipping') {
            $adjustedShippingFee = 0.0;
        }

        $totalAmount = max(0, round($baseTotal - $discountAmount, 2));

        return [
            'success' => true,
            'voucher' => $voucher,
            'voucher_discount_amount' => $discountAmount,
            'shipping_fee' => $adjustedShippingFee,
            'total_amount' => $totalAmount,
            'voucher_id' => $voucher->id,
            'voucher_code' => $voucher->code,
        ];
    }

    /**
     * @return true|string True when redeemable, otherwise an error message.
     */
    public function isStillRedeemable(Voucher $voucher, int $userId, float $subtotal, ?int $excludeOrderDetailId = null): bool|string
    {
        $this->refreshExpiredStatus($voucher);
        $voucher->refresh();

        if ($voucher->status === 'inactive') {
            return 'This voucher is inactive.';
        }

        if ($voucher->status === 'expired' || $voucher->end_date->isPast()) {
            return 'This voucher has expired.';
        }

        if ($voucher->status === 'scheduled' || $voucher->start_date->isFuture()) {
            return 'This voucher is not yet active.';
        }

        if ($voucher->status !== 'active') {
            return 'This voucher cannot be used.';
        }

        if ($voucher->minimum_order_amount !== null
            && $subtotal < (float) $voucher->minimum_order_amount
        ) {
            return 'Order does not meet the minimum amount for this voucher.';
        }

        $confirmedUses = (int) $voucher->usage_count;
        $pendingHolds = $this->countPendingHolds($voucher->id, excludeOrderDetailId: $excludeOrderDetailId);

        if ($voucher->usage_limit !== null
            && ($confirmedUses + $pendingHolds) >= (int) $voucher->usage_limit
        ) {
            return 'This voucher has reached its usage limit.';
        }

        if ($voucher->per_customer_limit !== null) {
            $customerUses = VoucherUsage::query()
                ->where('voucher_id', $voucher->id)
                ->where('user_id', $userId)
                ->count();

            $customerPendingHolds = $this->countPendingHolds(
                $voucher->id,
                $userId,
                $excludeOrderDetailId
            );

            if (($customerUses + $customerPendingHolds) >= (int) $voucher->per_customer_limit) {
                return 'You have already used this voucher the maximum number of times.';
            }
        }

        return true;
    }

    /**
     * Re-check voucher on an unpaid order before checkout. Strips it if no longer valid.
     *
     * @return array{stripped: bool, total_amount: float, message?: string}
     */
    public function finalizeForCheckout(OrderDetail $detail, int $userId): array
    {
        if ($detail->voucher_id === null) {
            return [
                'stripped' => false,
                'total_amount' => round((float) $detail->total_amount, 2),
            ];
        }

        $voucher = Voucher::query()->find($detail->voucher_id);
        $subtotal = round((float) $detail->subtotal, 2);

        if (! $voucher) {
            $this->stripFromOrderDetail($detail);

            return [
                'stripped' => true,
                'total_amount' => round((float) $detail->total_amount, 2),
                'message' => 'Voucher is no longer available; total updated.',
            ];
        }

        $redeemable = $this->isStillRedeemable(
            $voucher,
            $userId,
            $subtotal,
            $detail->id
        );

        if ($redeemable !== true) {
            $this->stripFromOrderDetail($detail);

            return [
                'stripped' => true,
                'total_amount' => round((float) $detail->total_amount, 2),
                'message' => is_string($redeemable)
                    ? $redeemable.' Total updated without voucher.'
                    : 'Voucher expired; total updated.',
            ];
        }

        return [
            'stripped' => false,
            'total_amount' => round((float) $detail->total_amount, 2),
        ];
    }

    public function stripFromOrderDetail(OrderDetail $detail): void
    {
        $shippingFee = round(
            (float) $detail->delivery_base_fee + (float) $detail->delivery_km_fee,
            2
        );

        $totalAmount = round(
            (float) $detail->subtotal
            + $shippingFee
            + (float) $detail->heavy_surcharge
            + (float) $detail->multi_store_fee
            + (float) $detail->mov_penalty_fee,
            2
        );

        $detail->voucher_id = null;
        $detail->voucher_code = null;
        $detail->voucher_discount_amount = 0;
        $detail->shipping_fee = $shippingFee;
        $detail->total_amount = max(0, $totalAmount);
        $detail->save();
    }

    public function recordUsage(Voucher $voucher, int $userId, int $orderId, float $voucherDiscountAmount): VoucherUsage
    {
        $existing = VoucherUsage::query()
            ->where('voucher_id', $voucher->id)
            ->where('order_id', $orderId)
            ->first();

        if ($existing) {
            return $existing;
        }

        $voucher->increment('usage_count');

        return VoucherUsage::create([
            'voucher_id' => $voucher->id,
            'user_id' => $userId,
            'order_id' => $orderId,
            'voucher_discount_amount' => $voucherDiscountAmount,
        ]);
    }

    private function countPendingHolds(
        int $voucherId,
        ?int $userId = null,
        ?int $excludeOrderDetailId = null
    ): int {
        $query = OrderDetail::query()
            ->where('voucher_id', $voucherId)
            ->where('payment_status', 'pending')
            // Exclude orders that already consumed a confirmed usage (e.g. COD).
            ->whereDoesntHave('orders', function ($q) use ($voucherId) {
                $q->whereHas('voucherUsages', function ($usageQuery) use ($voucherId) {
                    $usageQuery->where('voucher_id', $voucherId);
                });
            });

        if ($excludeOrderDetailId !== null) {
            $query->where('id', '!=', $excludeOrderDetailId);
        }

        if ($userId !== null) {
            $query->whereHas('orders', function ($q) use ($userId) {
                $q->where('user_id', $userId);
            });
        }

        return $query->count();
    }

    private function computeDiscount(Voucher $voucher, float $subtotal, float $shippingFee): float
    {
        return match ($voucher->type) {
            'percentage_off' => $this->percentageDiscount($voucher, $subtotal),
            'fixed_amount_off' => round(min((float) $voucher->discount_value, $subtotal), 2),
            'free_shipping' => round($shippingFee, 2),
            default => 0.0,
        };
    }

    private function percentageDiscount(Voucher $voucher, float $subtotal): float
    {
        $discount = round($subtotal * ((float) $voucher->discount_value) / 100, 2);

        if ($voucher->maximum_discount !== null) {
            $discount = min($discount, (float) $voucher->maximum_discount);
        }

        return round(min($discount, $subtotal), 2);
    }

    private function refreshExpiredStatus(Voucher $voucher): void
    {
        if (in_array($voucher->status, ['inactive', 'expired'], true)) {
            return;
        }

        if ($voucher->end_date->isPast()) {
            $voucher->status = 'expired';
            $voucher->save();
        }
    }

    /**
     * @return array{
     *     success: false,
     *     message: string,
     *     voucher: null,
     *     voucher_discount_amount: float,
     *     shipping_fee: float,
     *     total_amount: float,
     *     voucher_id: null,
     *     voucher_code: null
     * }
     */
    private function failure(string $message): array
    {
        return [
            'success' => false,
            'message' => $message,
            'voucher' => null,
            'voucher_discount_amount' => 0.0,
            'shipping_fee' => 0.0,
            'total_amount' => 0.0,
            'voucher_id' => null,
            'voucher_code' => null,
        ];
    }
}
