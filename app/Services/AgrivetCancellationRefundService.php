<?php

namespace App\Services;

use App\Models\FarmOrder;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderShop;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AgrivetCancellationRefundService
{
    /**
     * Queue a manual refund and alert super admins and admins when an Agrivet
     * cancels a shop order that was already paid.
     */
    public function queueFromShopCancellation(int $orderShopId, int $actorId, ?string $reason): void
    {
        $actor = User::query()->find($actorId);
        if (! $actor || ! in_array($actor->user_type, [User::TYPE_VENDOR, User::TYPE_OWNER_MANAGER], true)) {
            return;
        }

        try {
            $refund = $this->createPendingRefund($orderShopId, $actor, $reason);
        } catch (\Throwable $e) {
            Log::warning('Agrivet cancellation did not create a refund queue item.', [
                'order_shop_id' => $orderShopId,
                'actor_id' => $actorId,
                'error' => $e->getMessage(),
            ]);

            return;
        }

        if (! $refund) {
            return;
        }

        try {
            $this->notifyAdmins($refund);
        } catch (\Throwable $e) {
            Log::warning('Refund was queued but admin notification failed.', [
                'refund_id' => $refund->id,
                'order_shop_id' => $orderShopId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function createPendingRefund(int $orderShopId, User $actor, ?string $reason): ?Refund
    {
        return DB::transaction(function () use ($orderShopId, $actor, $reason) {
            $leg = OrderShop::query()->with(['order.orderDetail', 'shop.agrivet'])->lockForUpdate()->find($orderShopId);
            $order = $leg?->order;
            $detail = $order?->orderDetail;

            if (! $leg || ! $order || ! $detail || ! $leg->shop) {
                return null;
            }

            if ($this->isFarmOrder($order)) {
                return null;
            }

            Order::query()->whereKey($order->id)->lockForUpdate()->first();

            $existing = Refund::query()->where('order_shop_id', $leg->id)->lockForUpdate()->first();
            if ($existing) {
                return null;
            }

            $payment = Payment::query()
                ->where('order_id', $order->id)
                ->where('status', 'paid')
                ->orderByDesc('id')
                ->first();

            $paidAmount = (float) Payment::query()
                ->where('order_id', $order->id)
                ->where('status', 'paid')
                ->sum('amount');
            $detailPaid = strtolower((string) $detail->payment_status) === 'paid';

            if (! $detailPaid && $paidAmount < 0.01) {
                return null;
            }

            if ($paidAmount < 0.01) {
                $paidAmount = (float) $detail->total_amount;
            }

            if ($paidAmount < 0.01) {
                return null;
            }

            $items = OrderItem::query()->where('order_id', $order->id)->get();
            $merchandise = round((float) $items
                ->where('shop_id', $leg->shop_id)
                ->sum(fn (OrderItem $item) => (float) $item->quantity * (float) $item->price_at_purchase), 2);
            $allMerchandise = round((float) $items
                ->sum(fn (OrderItem $item) => (float) $item->quantity * (float) $item->price_at_purchase), 2);

            $alreadyQueued = (float) Refund::query()->where('order_id', $order->id)->sum('amount');
            $openLegs = DB::table('order_shops')
                ->join('order_status', 'order_shops.order_status', '=', 'order_status.id')
                ->where('order_shops.order_id', $order->id)
                ->where('order_shops.id', '!=', $leg->id)
                ->whereRaw("LOWER(order_status.stat_description) NOT LIKE 'cancel%'")
                ->exists();

            $amount = $openLegs
                ? $this->shareOfPaid($paidAmount, $merchandise, $allMerchandise, $alreadyQueued)
                : round(max(0, $paidAmount - $alreadyQueued), 2);

            if ($amount < 0.01) {
                return null;
            }

            $reference = trim((string) ($payment?->payment_id ?: $payment?->payment_intent_id ?: ''));

            return Refund::query()->create([
                'order_id' => $order->id,
                'order_shop_id' => $leg->id,
                'shop_id' => $leg->shop_id,
                'customer_user_id' => $order->user_id,
                'cancelled_by_user_id' => $actor->id,
                'payment_id' => $payment?->id,
                'amount' => $amount,
                'merchandise_amount' => $merchandise,
                'currency' => $payment?->currency ?: 'PHP',
                'payment_method' => $payment?->payment_method ?: $detail->payment_method,
                'payment_reference' => $reference !== '' ? $reference : null,
                'reason' => trim((string) $reason) !== '' ? trim((string) $reason) : null,
                'status' => Refund::STATUS_PENDING,
            ]);
        });
    }

    private function shareOfPaid(float $paidAmount, float $merchandise, float $allMerchandise, float $alreadyQueued): float
    {
        $remaining = round(max(0, $paidAmount - $alreadyQueued), 2);
        if ($remaining < 0.01) {
            return 0;
        }

        if ($allMerchandise < 0.01) {
            return $remaining;
        }

        $share = round($paidAmount * ($merchandise / $allMerchandise), 2);

        return round(min($share, $remaining), 2);
    }

    private function notifyAdmins(Refund $refund): void
    {
        $refund->loadMissing(['order.orderDetail', 'shop.agrivet']);

        $order = $refund->order;
        $code = trim((string) ($order?->orderDetail?->order_code ?? ''));
        $orderCode = $code !== '' ? $code : 'ORD-'.$refund->order_id;
        $shopName = trim((string) ($refund->shop?->shop_name ?? ''));
        $agrivetName = trim((string) ($refund->shop?->agrivet?->name ?? ''));
        $storeName = $shopName !== '' ? $shopName : ($agrivetName !== '' ? $agrivetName : 'An Agrivet');
        $amount = $this->formatMoney((float) $refund->amount, (string) $refund->currency);

        $admins = User::query()
            ->whereIn('user_type', [User::TYPE_SUPER_ADMIN, User::TYPE_ADMIN])
            ->where('status', User::STATUS_ACTIVE)
            ->get(['id', 'user_type']);

        foreach ($admins as $admin) {
            $base = $admin->user_type === User::TYPE_ADMIN
                ? '/dashboard/admin/refunds'
                : '/dashboard/super-admin/refunds';

            Notification::createForUser(
                (int) $admin->id,
                'refund_required',
                'Manual refund needed',
                "{$storeName} cancelled order {$orderCode}. Send a manual refund of {$amount}.",
                Notification::CATEGORY_PAYMENT,
                $order,
                [
                    'refund_id' => (int) $refund->id,
                    'order_id' => (int) $refund->order_id,
                    'order_code' => $orderCode,
                    'shop_id' => (int) $refund->shop_id,
                    'shop_name' => $storeName,
                    'agrivet_name' => $agrivetName !== '' ? $agrivetName : null,
                    'amount' => (float) $refund->amount,
                    'currency' => $refund->currency,
                ],
                $base.'?status=pending',
            );
        }
    }

    private function formatMoney(float $amount, string $currency): string
    {
        $formatted = number_format($amount, 2);

        return strtoupper($currency) === 'PHP' ? '₱'.$formatted : $currency.' '.$formatted;
    }

    private function isFarmOrder(Order $order): bool
    {
        return Schema::hasTable('farm_orders')
            && FarmOrder::query()->where('order_id', $order->id)->exists();
    }
};
