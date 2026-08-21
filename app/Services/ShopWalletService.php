<?php

namespace App\Services;

use App\Models\OrderItem;
use App\Models\Payout;
use App\Models\Shop;
use App\Models\ShopWalletTransaction;
use Illuminate\Support\Facades\DB;

class ShopWalletService
{
    public static function vendorShare(OrderItem $item): float
    {
        return round(max(0, (float) $item->quantity * (float) $item->price_at_purchase), 2);
    }

    public function creditFromOrderItem(OrderItem $item): void
    {
        if (! $item->shop_id) {
            return;
        }

        if (! $this->itemIsDelivered($item)) {
            return;
        }

        $expected = self::vendorShare($item);
        if ($expected < 0.01) {
            if (! $item->wallet_credited_at) {
                $item->forceFill(['wallet_credited_at' => now()])->saveQuietly();
            }

            return;
        }

        DB::transaction(function () use ($item, $expected) {
            $fresh = OrderItem::query()->whereKey($item->id)->lockForUpdate()->first();
            if (! $fresh) {
                return;
            }

            $shop = Shop::query()->whereKey($fresh->shop_id)->lockForUpdate()->first();
            if (! $shop) {
                return;
            }

            $existing = ShopWalletTransaction::query()
                ->where('order_item_id', $fresh->id)
                ->where('reason', ShopWalletTransaction::REASON_SALE)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                $delta = round($expected - (float) $existing->amount, 2);
                if ($delta < 0.01) {
                    if (! $fresh->wallet_credited_at) {
                        $fresh->forceFill(['wallet_credited_at' => now()])->saveQuietly();
                    }

                    return;
                }

                $balance = round((float) $shop->wallet_balance + $delta, 2);
                $shop->forceFill(['wallet_balance' => $balance])->save();
                $existing->forceFill([
                    'amount' => $expected,
                    'balance_after' => round((float) $existing->balance_after + $delta, 2),
                ])->save();
                $fresh->forceFill(['wallet_credited_at' => now()])->saveQuietly();

                return;
            }

            $balance = round((float) $shop->wallet_balance + $expected, 2);
            $shop->forceFill(['wallet_balance' => $balance])->save();

            $fresh->forceFill(['wallet_credited_at' => now()])->saveQuietly();

            ShopWalletTransaction::create([
                'shop_id' => $shop->id,
                'type' => ShopWalletTransaction::TYPE_CREDIT,
                'amount' => $expected,
                'balance_after' => $balance,
                'reason' => ShopWalletTransaction::REASON_SALE,
                'order_item_id' => $fresh->id,
            ]);
        });
    }

    /**
     * Credit any completed sales that have not yet been added to a shop wallet.
     *
     * @param  array<int, int>|null  $shopIds
     */
    public function syncUncreditedSales(?array $shopIds = null): void
    {
        $query = OrderItem::query()->whereNull('wallet_credited_at');

        if ($shopIds !== null) {
            $query->whereIn('shop_id', $shopIds);
        }

        $deliveredItemStatusId = $this->deliveredItemStatusId();
        $deliveredOrderStatusId = $this->deliveredOrderStatusId();

        $query->where(function ($q) use ($deliveredItemStatusId, $deliveredOrderStatusId) {
            $q->where('item_status', $deliveredItemStatusId)
                ->orWhereExists(function ($sub) use ($deliveredOrderStatusId) {
                    $sub->selectRaw('1')
                        ->from('order_shops')
                        ->whereColumn('order_shops.order_id', 'order_items.order_id')
                        ->whereColumn('order_shops.shop_id', 'order_items.shop_id')
                        ->where('order_shops.order_status', $deliveredOrderStatusId);
                });
        });

        foreach ($query->orderBy('id')->cursor() as $item) {
            $this->creditFromOrderItem($item);
        }

        $this->reconcileSaleCredits($shopIds);
    }

    /**
     * Top up sale credits that were stored as sale minus platform fee.
     *
     * @param  array<int, int>|null  $shopIds
     */
    public function reconcileSaleCredits(?array $shopIds = null): void
    {
        $query = ShopWalletTransaction::query()
            ->where('reason', ShopWalletTransaction::REASON_SALE)
            ->whereNotNull('order_item_id')
            ->with('orderItem');

        if ($shopIds !== null) {
            $query->whereIn('shop_id', $shopIds);
        }

        foreach ($query->orderBy('id')->cursor() as $transaction) {
            if ($transaction->orderItem) {
                $this->creditFromOrderItem($transaction->orderItem);
            }
        }
    }

    public function debitForPayout(Shop $shop, float $amount, Payout $payout): void
    {
        $balance = round(max(0, (float) $shop->wallet_balance - $amount), 2);
        $shop->forceFill(['wallet_balance' => $balance])->save();

        ShopWalletTransaction::create([
            'shop_id' => $shop->id,
            'type' => ShopWalletTransaction::TYPE_DEBIT,
            'amount' => $amount,
            'balance_after' => $balance,
            'reason' => ShopWalletTransaction::REASON_PAYOUT,
            'payout_id' => $payout->id,
        ]);
    }

    public function deliveredItemStatusId(): int
    {
        return (int) (DB::table('order_item_status')->where('stat_description', 'Delivered')->value('id') ?: 6);
    }

    public function deliveredOrderStatusId(): int
    {
        return (int) (DB::table('order_status')->where('stat_description', 'Delivered')->value('id') ?: 6);
    }

    private function itemIsDelivered(OrderItem $item): bool
    {
        if ((int) $item->item_status === $this->deliveredItemStatusId()) {
            return true;
        }

        return DB::table('order_shops')
            ->where('order_id', $item->order_id)
            ->where('shop_id', $item->shop_id)
            ->where('order_status', $this->deliveredOrderStatusId())
            ->exists();
    }
}
