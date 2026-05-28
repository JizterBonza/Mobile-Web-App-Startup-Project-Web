<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

trait ManagesShopOrders
{
    /**
     * Orders for store management UI (scoped to the given shop IDs).
     *
     * @param  array<int>  $shopIds
     * @return array<int, array<string, mixed>>
     */
    protected function buildShopOrders(array $shopIds, int $preparingItemStatusId = 0): array
    {
        $orderIds = DB::table('order_shops')
            ->whereIn('shop_id', $shopIds)
            ->distinct()
            ->pluck('order_id')
            ->merge(
                DB::table('order_items')
                    ->whereIn('shop_id', $shopIds)
                    ->distinct()
                    ->pluck('order_id')
            )
            ->unique()
            ->values();

        if ($orderIds->isEmpty()) {
            return [];
        }

        $deliveryMethodNames = DB::table('delivery_method')
            ->where('status', true)
            ->pluck('description', 'id');
        $deliveryMethodInfos = DB::table('delivery_method')
            ->where('status', true)
            ->pluck('info', 'id');

        $orderShopAgg = DB::table('order_shops')
            ->whereIn('shop_id', $shopIds)
            ->whereIn('order_id', $orderIds)
            ->select('order_id', DB::raw('MAX(order_status) as order_status'))
            ->groupBy('order_id');

        $orderRows = DB::table('orders')
            ->whereIn('orders.id', $orderIds)
            ->leftJoinSub($orderShopAgg, 'os_agg', 'orders.id', '=', 'os_agg.order_id')
            ->leftJoin('order_status', 'os_agg.order_status', '=', 'order_status.id')
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
            ->leftJoin('order_details', 'orders.order_detail_id', '=', 'order_details.id')
            ->leftJoin('delivery_method', 'order_details.delivery_method_id', '=', 'delivery_method.id')
            ->leftJoin('addresses', 'order_details.address_id', '=', 'addresses.id')
            ->select(
                'orders.id',
                'orders.ordered_at',
                'order_details.delivery_method_id as order_delivery_method_id',
                'delivery_method.description as delivery_method_name',
                'delivery_method.info as delivery_method_info',
                'order_status.stat_description as status_description',
                'user_details.first_name',
                'user_details.last_name',
                'user_details.mobile_number',
                'user_details.profile_image_url',
                'user_details.avatar',
                'addresses.street_address',
                'addresses.barangay',
                'addresses.city_municipality',
                'addresses.province',
                'addresses.contact_number as address_contact',
            )
            ->orderByDesc('orders.ordered_at')
            ->get();

        if ($preparingItemStatusId === 0 && Schema::hasTable('order_item_status')) {
            $preparingItemStatusId = (int) (DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id') ?? 0);
        }

        $itemsByOrder = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->leftJoin('order_item_status', 'order_items.item_status', '=', 'order_item_status.id')
            ->whereIn('order_items.shop_id', $shopIds)
            ->whereIn('order_items.order_id', $orderIds)
            ->select(
                'order_items.order_id',
                'order_items.id',
                'items.item_name',
                'order_items.quantity',
                'order_items.price_at_purchase',
                'order_items.item_status as item_status_id',
                'order_item_status.stat_description as item_status_description',
                'items.item_images',
            )
            ->orderBy('order_items.id')
            ->get()
            ->groupBy('order_id');

        $ridersByOrder = DB::table('order_shops')
            ->whereIn('shop_id', $shopIds)
            ->whereIn('order_id', $orderIds)
            ->whereNotNull('rider_id')
            ->join('users', 'order_shops.rider_id', '=', 'users.id')
            ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
            ->select(
                'order_shops.order_id',
                'user_details.first_name as rider_first_name',
                'user_details.last_name as rider_last_name',
                'user_details.mobile_number as rider_phone',
                'user_details.profile_image_url as rider_profile_image_url',
                'user_details.avatar as rider_avatar',
                'user_details.rider_vehicle_type',
            )
            ->get()
            ->keyBy('order_id');

        $proofByOrder = DB::table('proof_of_delivery')
            ->whereIn('order_id', $orderIds)
            ->select('order_id', 'image_path')
            ->get()
            ->keyBy('order_id');

        $shopIdsByOrder = DB::table('order_shops')
            ->whereIn('shop_id', $shopIds)
            ->whereIn('order_id', $orderIds)
            ->select('order_id', 'shop_id')
            ->get()
            ->groupBy('order_id')
            ->map(fn ($rows) => $rows->pluck('shop_id')->map(fn ($id) => (int) $id)->values()->all());

        $declineByOrder = collect();
        if (Schema::hasTable('order_logs')) {
            $declineByOrder = DB::table('order_logs')
                ->whereIn('order_id', $orderIds)
                ->where('event', 'cancelled')
                ->orderByDesc('created_at')
                ->get()
                ->unique('order_id')
                ->keyBy('order_id');
        }

        return $orderRows->map(function ($row) use ($itemsByOrder, $ridersByOrder, $proofByOrder, $shopIdsByOrder, $declineByOrder, $deliveryMethodNames, $deliveryMethodInfos, $preparingItemStatusId) {
            $statusMeta = $this->mapShopOrderStatus($row->status_description ?? '');
            $products = ($itemsByOrder->get($row->id) ?? collect())->map(function ($item) {
                $thumbnail = $this->firstItemImageUrl($item->item_images);

                return [
                    'id'           => (int) $item->id,
                    'name'         => $item->item_name,
                    'quantity'     => (int) $item->quantity,
                    'price'        => (float) $item->price_at_purchase,
                    'thumbnail'    => $thumbnail,
                    'itemStatusId' => (int) $item->item_status_id,
                    'itemStatus'   => $item->item_status_description ?? 'Unknown',
                ];
            })->values()->all();

            $allItemsDonePreparing = $preparingItemStatusId > 0
                && count($products) > 0
                && collect($products)->every(fn (array $product) => (int) $product['itemStatusId'] !== $preparingItemStatusId);

            $rider = $ridersByOrder->get($row->id);
            $riderDetails = null;
            if ($rider) {
                $riderDetails = [
                    'name'           => trim(($rider->rider_first_name ?? '').' '.($rider->rider_last_name ?? '')),
                    'phone'          => $rider->rider_phone ?? '',
                    'vehicleType'    => $rider->rider_vehicle_type ?? '—',
                    'plateNumber'    => '—',
                    'profilePicture' => $rider->rider_profile_image_url ?: $rider->rider_avatar,
                ];
            }

            $proof = $proofByOrder->get($row->id);
            $customerPhone = $row->address_contact ?: $row->mobile_number ?: '';

            $deliveryMethodId = isset($row->order_delivery_method_id) && $row->order_delivery_method_id !== ''
                ? (int) $row->order_delivery_method_id
                : null;
            $deliveryMethodName = $row->delivery_method_name
                ?? ($deliveryMethodId ? ($deliveryMethodNames[$deliveryMethodId] ?? null) : null);
            $deliveryMethodInfo = $row->delivery_method_info
                ?? ($deliveryMethodId ? ($deliveryMethodInfos[$deliveryMethodId] ?? null) : null);

            $payload = [
                'id'                     => (int) $row->id,
                'orderNumber'            => 'ORD-'.$row->id,
                'shopIds'                => $shopIdsByOrder->get($row->id, []),
                'customerName'           => trim(($row->first_name ?? '').' '.($row->last_name ?? '')),
                'customerPhone'          => $customerPhone,
                'customerProfilePicture' => $row->profile_image_url ?: $row->avatar,
                'dateOfOrder'            => $row->ordered_at,
                'products'               => $products,
                'deliveryAddress'        => [
                    'street'   => $row->street_address ?? '',
                    'barangay' => $row->barangay ?? '',
                    'city'     => $row->city_municipality ?? '',
                    'province' => $row->province ?? '',
                ],
                'status'                 => $statusMeta['status'],
                'deliveryMethodId'       => $deliveryMethodId,
                'deliveryMethodName'     => $deliveryMethodName,
                'deliveryMethod'         => $deliveryMethodId ? [
                    'id'   => $deliveryMethodId,
                    'name' => $deliveryMethodName ?? 'Unknown',
                    'info' => $deliveryMethodInfo,
                ] : null,
                'readyButtonLabel'       => $this->readyButtonLabelForDeliveryMethod($deliveryMethodId),
                'allItemsDonePreparing'  => $allItemsDonePreparing,
            ];

            if ($riderDetails) {
                $payload['riderDetails'] = $riderDetails;
            }

            if ($statusMeta['status'] === 'completed') {
                $payload['isSuccessful'] = $statusMeta['isSuccessful'];
                $declineLog = $declineByOrder->get($row->id);
                $payload['completionDate'] = $declineLog?->created_at ?? $row->ordered_at;
                if ($statusMeta['isSuccessful'] === false && $declineLog?->notes) {
                    $payload['declineReason'] = $declineLog->notes;
                }
                if ($statusMeta['isSuccessful'] && $proof?->image_path) {
                    $payload['proofOfDelivery'] = $proof->image_path;
                }
            }

            return $payload;
        })->values()->all();
    }

    /**
     * @return array<int, array{id: int, name: string, info: string|null}>
     */
    protected function activeDeliveryMethods(): array
    {
        if (! Schema::hasTable('delivery_method')) {
            return [];
        }

        return DB::table('delivery_method')
            ->where('status', true)
            ->orderBy('id')
            ->get(['id', 'description', 'info'])
            ->map(fn ($row) => [
                'id'   => (int) $row->id,
                'name' => $row->description,
                'info' => $row->info,
            ])
            ->values()
            ->all();
    }

    protected function preparingItemStatusId(): int
    {
        if (! Schema::hasTable('order_item_status')) {
            return 0;
        }

        return (int) (DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id') ?? 0);
    }

    /**
     * @param  array<int>  $shopIds
     */
    protected function assertShopOrderAccess(int $orderId, array $shopIds): void
    {
        $accessible = DB::table('order_shops')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->exists();

        if (! $accessible) {
            $accessible = DB::table('order_items')
                ->where('order_id', $orderId)
                ->whereIn('shop_id', $shopIds)
                ->exists();
        }

        abort_unless($accessible, 404);
    }

    /**
     * @return array{status: string, isSuccessful: bool|null}
     */
    protected function mapShopOrderStatus(string $description): array
    {
        $d = strtolower(trim($description));

        if (str_contains($d, 'cancel')) {
            return ['status' => 'completed', 'isSuccessful' => false];
        }
        if (str_contains($d, 'ready for')) {
            return ['status' => 'for-pickup', 'isSuccessful' => null];
        }
        if (str_contains($d, 'delivered')) {
            return ['status' => 'completed', 'isSuccessful' => true];
        }
        if (str_contains($d, 'transit')) {
            return ['status' => 'in-transit', 'isSuccessful' => null];
        }
        if (str_contains($d, 'prepar')) {
            return ['status' => 'preparing', 'isSuccessful' => null];
        }
        if (str_contains($d, 'pending')) {
            return ['status' => 'new', 'isSuccessful' => null];
        }

        return ['status' => 'new', 'isSuccessful' => null];
    }

    /**
     * @return array{order_status_id: int, order_item_status_id: int|null, label: string}|null
     */
    protected function resolveShopReadyStatus(int $orderId): ?array
    {
        $deliveryMethodId = DB::table('orders')
            ->join('order_details', 'orders.order_detail_id', '=', 'order_details.id')
            ->where('orders.id', $orderId)
            ->value('order_details.delivery_method_id');

        $deliveryMethodId = $deliveryMethodId !== null ? (int) $deliveryMethodId : null;

        $statusByDeliveryMethod = [
            1 => 'Ready for Delivery',
            2 => 'Ready for Drop off',
            3 => 'Ready for Pickup',
        ];

        if ($deliveryMethodId === null || ! isset($statusByDeliveryMethod[$deliveryMethodId])) {
            return null;
        }

        $label = $statusByDeliveryMethod[$deliveryMethodId];
        $orderStatusId = DB::table('order_status')->where('stat_description', $label)->value('id');

        if (! $orderStatusId) {
            return null;
        }

        $itemStatusId = DB::table('order_item_status')->where('stat_description', $label)->value('id');

        return [
            'order_status_id'      => (int) $orderStatusId,
            'order_item_status_id' => $itemStatusId ? (int) $itemStatusId : null,
            'label'                => $label,
        ];
    }

    protected function readyButtonLabelForDeliveryMethod(?int $deliveryMethodId): string
    {
        return match ($deliveryMethodId) {
            1       => 'Mark Ready for Delivery',
            2       => 'Mark Ready for Drop off',
            3       => 'Mark Ready for Pickup',
            default => 'Mark Order Ready',
        };
    }

    protected function logShopOrderEvent(
        int $orderId,
        string $event,
        ?string $fromStatus,
        ?string $toStatus,
        ?string $notes = null,
    ): void {
        if (! Schema::hasTable('order_logs')) {
            return;
        }

        DB::table('order_logs')->insert([
            'order_id'    => $orderId,
            'event'       => $event,
            'from_status' => $fromStatus,
            'to_status'   => $toStatus,
            'user_id'     => auth()->id(),
            'notes'       => $notes,
            'ip_address'  => request()->ip(),
            'user_agent'  => request()->userAgent(),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }

    protected function firstItemImageUrl(mixed $itemImages): ?string
    {
        if ($itemImages === null || $itemImages === '') {
            return null;
        }

        $decoded = is_string($itemImages) ? json_decode($itemImages, true) : $itemImages;
        if (! is_array($decoded) || $decoded === []) {
            return null;
        }

        $first = $decoded[0];
        if (is_string($first)) {
            return $first;
        }
        if (is_array($first)) {
            return $first['url'] ?? $first['path'] ?? null;
        }

        return null;
    }
}
