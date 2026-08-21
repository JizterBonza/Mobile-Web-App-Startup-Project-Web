<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderStatusCustomerMessageService
{
    public function __construct(
        private readonly ShopMessagingService $messaging,
    ) {}

    /**
     * Notify the customer in shop chat when an order_shop status changes.
     *
     * @param  array<int, int>  $shopIds
     */
    public function notifyForShops(
        int $orderId,
        array $shopIds,
        string $statusDescription,
        ?User $actor = null,
    ): void {
        $shopIds = collect($shopIds)->map(fn ($id) => (int) $id)->filter()->unique()->values()->all();
        if ($shopIds === []) {
            return;
        }

        $order = Order::query()->with(['user', 'orderDetail', 'orderItems.item'])->find($orderId);
        if (! $order?->user) {
            return;
        }

        $orderLabel = $this->orderLabel($order);
        $shops = Shop::query()->whereIn('id', $shopIds)->get()->keyBy('id');

        foreach ($shopIds as $shopId) {
            $shop = $shops->get($shopId);
            if (! $shop) {
                continue;
            }

            $shopItems = $order->orderItems
                ->filter(fn ($item) => (int) $item->shop_id === $shopId)
                ->values();
            $total = $shopItems->isEmpty()
                ? null
                : round($shopItems->sum(
                    fn ($item) => (float) $item->price_at_purchase * (int) $item->quantity
                ), 2);

            $body = $this->messageBody($statusDescription, $orderLabel);
            if ($body === null) {
                return;
            }

            $sender = $this->resolveStaffSender($shop, $actor);
            if (! $sender) {
                Log::warning('Skipped order status customer message: no shop staff sender.', [
                    'order_id' => $orderId,
                    'shop_id' => $shopId,
                    'status' => $statusDescription,
                ]);
                continue;
            }

            try {
                $conversation = $this->messaging->findOrCreate($shop, $order->user);
                $products = $shopItems
                    ->map(fn ($orderItem) => $this->messaging->productMetadataFromOrderItem($orderItem))
                    ->values()
                    ->all();

                $this->messaging->sendOrderUpdateMessage(
                    $conversation,
                    $sender,
                    $body,
                    $products,
                    $total,
                    [
                        'order_id' => $orderId,
                        'status' => $statusDescription,
                    ],
                );
            } catch (\Throwable $e) {
                Log::warning('Failed to send order status customer message.', [
                    'order_id' => $orderId,
                    'shop_id' => $shopId,
                    'status' => $statusDescription,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * @param  array<int, int>  $shopIds
     */
    public function notifyForStatusId(
        int $orderId,
        array $shopIds,
        int $statusId,
        ?User $actor = null,
    ): void {
        $statusDescription = DB::table('order_status')
            ->where('id', $statusId)
            ->value('stat_description');

        if (! is_string($statusDescription) || $statusDescription === '') {
            return;
        }

        $this->notifyForShops($orderId, $shopIds, $statusDescription, $actor);
    }

    public function messageBody(
        string $statusDescription,
        string $orderLabel,
    ): ?string {
        $orderLabel = trim($orderLabel);
        if ($orderLabel === '') {
            $orderLabel = 'your order';
        }

        $key = strtolower(trim($statusDescription));
        $key = str_replace(['_', '–', '—'], '-', $key);
        $key = preg_replace('/\s+/', ' ', $key) ?? $key;

        $template = match (true) {
            $key === 'preparing' => 'Your order %s has been accepted and is now being prepared.',
            $key === 'ready for drop off', $key === 'ready for drop-off' => 'Your order %s is done preparing and ready for drop off.',
            $key === 'ready for delivery' => 'Your order %s is done preparing and ready for delivery.',
            $key === 'ready for pickup' => 'Your order %s is done preparing and ready for pickup.',
            $key === 'in-transit', $key === 'in transit' => 'Your order %s is now in transit.',
            $key === 'delivered' => 'Your order %s has been delivered.',
            default => null,
        };

        if ($template === null) {
            return null;
        }

        $body = sprintf($template, $orderLabel);

        return $body;
    }

    private function orderLabel(Order $order): string
    {
        $code = trim((string) ($order->orderDetail?->order_code ?? ''));
        if ($code !== '') {
            return $code;
        }

        return 'ORD-'.$order->id;
    }

    private function resolveStaffSender(Shop $shop, ?User $actor): ?User
    {
        if ($actor && in_array($actor->user_type, [User::TYPE_OWNER_MANAGER, User::TYPE_VENDOR], true)) {
            return $actor;
        }

        $ownerManager = User::query()
            ->where('user_type', User::TYPE_OWNER_MANAGER)
            ->where('agrivet_id', $shop->agrivet_id)
            ->first();

        if ($ownerManager) {
            return $ownerManager;
        }

        return $shop->vendors()->first();
    }
}
