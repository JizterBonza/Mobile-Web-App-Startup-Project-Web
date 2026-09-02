<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderShop;
use Illuminate\Support\Facades\DB;

class OrderLifecycleNotificationService
{
    /**
     * @param  array<int, int>  $orderShopIds
     */
    public function notifyOrderAccepted(int $orderId, int $riderId, array $orderShopIds): void
    {
        $orderShopIds = collect($orderShopIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        if ($orderShopIds === []) {
            return;
        }

        $order = Order::query()->with('orderDetail')->find($orderId);
        if (! $order) {
            return;
        }

        $shopIds = OrderShop::query()
            ->where('order_id', $orderId)
            ->where('rider_id', $riderId)
            ->whereIn('id', $orderShopIds)
            ->orderBy('id')
            ->pluck('shop_id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $data = [
            'order_id' => (int) $order->id,
            'order_code' => $this->orderLabel($order),
            'rider_id' => $riderId,
            'order_shop_ids' => $orderShopIds,
            'shop_ids' => $shopIds,
        ];

        DB::transaction(function () use ($order, $riderId, $data) {
            Notification::createForUser(
                $riderId,
                'order_accepted',
                'Order Accepted',
                "You successfully accepted order {$data['order_code']} for delivery.",
                Notification::CATEGORY_ORDER,
                $order,
                $data,
            );

            Notification::createForUser(
                (int) $order->user_id,
                'order_accepted',
                'Rider Assigned',
                "A rider has accepted order {$data['order_code']} for delivery.",
                Notification::CATEGORY_ORDER,
                $order,
                $data,
            );
        });
    }

    public function notifyOrderPickedUp(int $orderShopId, int $riderId): void
    {
        $this->notifyRiderForShopLeg(
            $orderShopId,
            $riderId,
            'order_picked_up',
            'Pickup Successful',
            fn (string $orderCode, string $shopName) => "You successfully picked up order {$orderCode} from {$shopName}.",
            'In-Transit',
        );
    }

    public function notifyOrderDelivered(int $orderShopId, int $riderId): void
    {
        $this->notifyRiderForShopLeg(
            $orderShopId,
            $riderId,
            'order_delivered',
            'Delivery Completed',
            fn (string $orderCode, string $shopName) => "You successfully completed delivery for order {$orderCode} from {$shopName}.",
            'Delivered',
        );
    }

    /**
     * @param  callable(string, string): string  $message
     */
    private function notifyRiderForShopLeg(
        int $orderShopId,
        int $riderId,
        string $type,
        string $title,
        callable $message,
        string $status,
    ): void {
        $orderShop = OrderShop::query()
            ->with(['order.orderDetail', 'shop'])
            ->where('rider_id', $riderId)
            ->find($orderShopId);

        if (! $orderShop?->order) {
            return;
        }

        $orderCode = $this->orderLabel($orderShop->order);
        $shopName = trim((string) ($orderShop->shop?->shop_name ?? 'the pickup location'));
        if ($shopName === '') {
            $shopName = 'the pickup location';
        }

        Notification::createForUser(
            $riderId,
            $type,
            $title,
            $message($orderCode, $shopName),
            Notification::CATEGORY_ORDER,
            $orderShop->order,
            [
                'order_id' => (int) $orderShop->order_id,
                'order_code' => $orderCode,
                'rider_id' => $riderId,
                'order_shop_id' => (int) $orderShop->id,
                'shop_id' => (int) $orderShop->shop_id,
                'shop_name' => $shopName,
                'status' => $status,
            ],
        );
    }

    private function orderLabel(Order $order): string
    {
        $code = trim((string) ($order->orderDetail?->order_code ?? ''));

        return $code !== '' ? $code : 'ORD-'.$order->id;
    }
}
