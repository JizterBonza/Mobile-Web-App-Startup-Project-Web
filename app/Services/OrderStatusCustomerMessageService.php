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
        ?string $declineReason = null,
        ?string $source = null,
    ): void {
        if ($this->shouldSkipCancelledCustomerMessage($statusDescription, $actor, $source)) {
            return;
        }

        $shopIds = collect($shopIds)->map(fn ($id) => (int) $id)->filter()->unique()->values()->all();
        if ($shopIds === []) {
            return;
        }

        $order = Order::query()->with(['user', 'orderDetail', 'orderItems'])->find($orderId);
        if (! $order?->user) {
            Log::warning('Skipped order status customer message: order or customer missing.', [
                'order_id' => $orderId,
                'status' => $statusDescription,
            ]);

            return;
        }

        $orderLabel = $this->orderLabel($order);
        $body = $this->messageBody($statusDescription, $orderLabel, $declineReason);
        if ($body === null) {
            return;
        }

        try {
            $order->load(['orderItems.item']);
        } catch (\Throwable $e) {
            Log::warning('Order status customer message: failed to load order items.', [
                'order_id' => $orderId,
                'error' => $e->getMessage(),
            ]);
        }

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

            $sender = $this->resolveStaffSender($shop, $actor);
            if (! $sender) {
                Log::warning('Skipped order status customer message: no shop staff sender.', [
                    'order_id' => $orderId,
                    'shop_id' => $shopId,
                    'status' => $statusDescription,
                ]);

                continue;
            }

            $products = $shopItems
                ->map(function ($orderItem) use ($orderId, $shopId) {
                    try {
                        return $this->messaging->productMetadataFromOrderItem($orderItem);
                    } catch (\Throwable $e) {
                        Log::warning('Order status customer message: skipped product snapshot.', [
                            'order_id' => $orderId,
                            'shop_id' => $shopId,
                            'order_item_id' => $orderItem->id ?? null,
                            'error' => $e->getMessage(),
                        ]);

                        return null;
                    }
                })
                ->filter()
                ->values()
                ->all();

            try {
                $conversation = $this->messaging->findOrCreate($shop, $order->user);

                try {
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
                    Log::warning('Order update message failed; falling back to text.', [
                        'order_id' => $orderId,
                        'shop_id' => $shopId,
                        'status' => $statusDescription,
                        'error' => $e->getMessage(),
                    ]);

                    $this->messaging->sendMessage($conversation, $sender, $body, [], true);
                }
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
        ?string $declineReason = null,
        ?string $source = null,
    ): void {
        $statusDescription = DB::table('order_status')
            ->where('id', $statusId)
            ->value('stat_description');

        if (! is_string($statusDescription) || $statusDescription === '') {
            return;
        }

        $this->notifyForShops($orderId, $shopIds, $statusDescription, $actor, $declineReason, $source);
    }

    public function messageBody(
        string $statusDescription,
        string $orderLabel,
        ?string $declineReason = null,
    ): ?string {
        $orderLabel = trim($orderLabel);
        if ($orderLabel === '') {
            $orderLabel = 'your order';
        }

        $key = $this->statusKey($statusDescription);

        $template = match (true) {
            $key === 'preparing' => 'Your order %s has been accepted and is now being prepared.',
            $key === 'ready for drop off', $key === 'ready for drop-off' => 'Your order %s is done preparing and ready for drop off.',
            $key === 'ready for delivery' => 'Your order %s is done preparing and ready for delivery.',
            $key === 'ready for pickup' => 'Your order %s is done preparing and ready for pickup.',
            $key === 'in-transit', $key === 'in transit' => 'Your order %s is now in transit.',
            $key === 'delivered' => 'Your order %s has been delivered.',
            $this->isCancelledStatus($statusDescription) => 'Your order %s was declined.',
            default => null,
        };

        if ($template === null) {
            return null;
        }

        $body = sprintf($template, $orderLabel);

        if ($this->isCancelledStatus($statusDescription)) {
            $reason = trim((string) $declineReason);
            if ($reason !== '') {
                $body .= ' Reason: '.$reason;
            }
        }

        return $body;
    }

    private function shouldSkipCancelledCustomerMessage(
        string $statusDescription,
        ?User $actor,
        ?string $source,
    ): bool {
        if (! $this->isCancelledStatus($statusDescription)) {
            return false;
        }

        if (in_array($source, ['owner_manager_dashboard', 'vendor_dashboard'], true)) {
            return false;
        }

        return ! $this->isShopStaff($actor);
    }

    private function isCancelledStatus(string $statusDescription): bool
    {
        $key = $this->statusKey($statusDescription);

        return in_array($key, ['cancelled', 'canceled', 'declined'], true)
            || str_starts_with($key, 'cancel');
    }

    private function statusKey(string $status): string
    {
        $status = strtolower(trim($status));
        $status = str_replace(['_', '–', '—'], '-', $status);

        return preg_replace('/\s+/', ' ', $status) ?? $status;
    }

    private function isShopStaff(?User $actor): bool
    {
        return $actor !== null
            && in_array($actor->user_type, [User::TYPE_OWNER_MANAGER, User::TYPE_VENDOR], true);
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
        if ($this->isShopStaff($actor)) {
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
