<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ManagesShopOrders;
use App\Models\Item;
use App\Models\Shop;
use App\Models\User;
use App\Support\PublicStorage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class LogisticsCoordinationController extends Controller
{
    use ManagesShopOrders;

    public function orders(): Response
    {
        $shops = $this->agrivetShops();
        $shopIds = array_column($shops, 'id');
        $preparingItemStatusId = $this->preparingItemStatusId();

        return Inertia::render('Dashboard/LogisticsOrders', [
            'orders' => $shopIds === [] ? [] : $this->buildShopOrders($shopIds, $preparingItemStatusId),
            'deliveryMethods' => $shopIds === [] ? [] : $this->activeDeliveryMethods(),
            'preparingItemStatusId' => $preparingItemStatusId ?: null,
            'shops' => $shops,
            'agrivets' => $this->agrivetsFromShops($shops),
        ]);
    }

    public function products(Request $request): Response
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'agrivet_id' => ['nullable', 'integer'],
            'shop_id' => ['nullable', 'integer'],
            'status' => ['nullable', 'string', 'in:active,inactive,out_of_stock'],
        ]);

        $search = trim((string) ($filters['q'] ?? ''));
        $agrivetId = isset($filters['agrivet_id']) ? (int) $filters['agrivet_id'] : null;
        $shopId = isset($filters['shop_id']) ? (int) $filters['shop_id'] : null;
        $status = $filters['status'] ?? '';

        $query = Item::query()
            ->with([
                'shop:id,shop_name,shop_status,agrivet_id',
                'shop.agrivet:id,name,status',
                'categoryRelation:id,category_name',
            ])
            ->whereHas('shop', function ($shop) use ($agrivetId, $shopId) {
                $shop->whereNotNull('agrivet_id');
                if ($agrivetId) {
                    $shop->where('agrivet_id', $agrivetId);
                }
                if ($shopId) {
                    $shop->where('id', $shopId);
                }
            });

        if ($search !== '') {
            $like = '%'.$search.'%';
            $query->where(function ($items) use ($like) {
                $items->where('item_name', 'like', $like)
                    ->orWhereHas('productCatalog', fn ($catalog) => $catalog->where('product_name', 'like', $like))
                    ->orWhereHas('shop', function ($shop) use ($like) {
                        $shop->where('shop_name', 'like', $like)
                            ->orWhereHas('agrivet', fn ($agrivet) => $agrivet->where('name', 'like', $like));
                    });
            });
        }

        if ($status === 'active' || $status === 'inactive') {
            $query->where('item_status', $status);
        } elseif ($status === 'out_of_stock') {
            $query->where('item_quantity', '<=', 0);
        }

        $products = $query
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Item $item) => $this->productPayload($item));

        $shops = $this->agrivetShops();
        $counts = Item::query()
            ->whereHas('shop', fn ($shop) => $shop->whereNotNull('agrivet_id'))
            ->selectRaw("COUNT(*) as total")
            ->selectRaw("SUM(CASE WHEN item_status = 'active' THEN 1 ELSE 0 END) as active_count")
            ->selectRaw("SUM(CASE WHEN item_status = 'inactive' THEN 1 ELSE 0 END) as inactive_count")
            ->selectRaw('SUM(CASE WHEN item_quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_count')
            ->first();

        return Inertia::render('Dashboard/LogisticsProducts', [
            'products' => $products,
            'shops' => $shops,
            'agrivets' => $this->agrivetsFromShops($shops),
            'summary' => [
                'total' => (int) ($counts->total ?? 0),
                'active' => (int) ($counts->active_count ?? 0),
                'inactive' => (int) ($counts->inactive_count ?? 0),
                'out_of_stock' => (int) ($counts->out_of_stock_count ?? 0),
            ],
            'filters' => [
                'q' => $search,
                'agrivet_id' => $agrivetId ? (string) $agrivetId : '',
                'shop_id' => $shopId ? (string) $shopId : '',
                'status' => $status,
            ],
        ]);
    }

    public function acceptOrder(int $orderId): RedirectResponse
    {
        $shopIds = $this->agrivetShopIdsOrAbort();
        $this->assertShopOrderAccess($orderId, $shopIds);

        $pendingStatusId = (int) DB::table('order_status')->where('stat_description', 'Pending')->value('id');
        $preparingStatusId = (int) DB::table('order_status')->where('stat_description', 'Preparing')->value('id');

        if (! $pendingStatusId || ! $preparingStatusId) {
            return $this->redirectToOrders()->with('error', 'Order status configuration is missing.');
        }

        $orderShops = DB::table('order_shops')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->get();

        if ($orderShops->isEmpty()) {
            abort(404);
        }

        if ($orderShops->contains(fn ($row) => (int) $row->order_status !== $pendingStatusId)) {
            return $this->redirectToOrders()->with('error', 'Only pending orders can be accepted.');
        }

        $error = $this->transitionShopOrderRows(
            $orderShops,
            $preparingStatusId,
            'Order accepted by logistics coordination.',
            'logistics_coordination',
        );
        if ($error) {
            return $this->redirectToOrders()->with('error', $error);
        }

        $preparingItemStatusId = DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id');
        if ($preparingItemStatusId) {
            DB::table('order_items')
                ->where('order_id', $orderId)
                ->whereIn('shop_id', $shopIds)
                ->update(['item_status' => (int) $preparingItemStatusId, 'updated_at' => now()]);
        }

        return $this->redirectToOrders()->with('success', 'Order accepted successfully.');
    }

    public function declineOrder(Request $request, int $orderId): RedirectResponse
    {
        $shopIds = $this->agrivetShopIdsOrAbort();
        $this->assertShopOrderAccess($orderId, $shopIds);

        $request->validate([
            'decline_reason' => 'required|string|max:1000',
        ]);

        $pendingStatusId = (int) DB::table('order_status')->where('stat_description', 'Pending')->value('id');
        $cancelledStatusId = (int) DB::table('order_status')->where('stat_description', 'Cancelled')->value('id');

        if (! $pendingStatusId || ! $cancelledStatusId) {
            return $this->redirectToOrders()->with('error', 'Order status configuration is missing.');
        }

        $orderShops = DB::table('order_shops')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->get();

        if ($orderShops->isEmpty()) {
            abort(404);
        }

        if ($orderShops->contains(fn ($row) => (int) $row->order_status !== $pendingStatusId)) {
            return $this->redirectToOrders()->with('error', 'Only pending orders can be declined.');
        }

        $declineReason = trim($request->input('decline_reason'));
        $error = $this->transitionShopOrderRows(
            $orderShops,
            $cancelledStatusId,
            $declineReason,
            'logistics_coordination',
        );
        if ($error) {
            return $this->redirectToOrders()->with('error', $error);
        }

        $cancelledItemStatusId = DB::table('order_item_status')->where('stat_description', 'Cancelled')->value('id');
        if ($cancelledItemStatusId) {
            DB::table('order_items')
                ->where('order_id', $orderId)
                ->whereIn('shop_id', $shopIds)
                ->update(['item_status' => (int) $cancelledItemStatusId, 'updated_at' => now()]);
        }

        return $this->redirectToOrders()->with('success', 'Order declined successfully.');
    }

    public function markOrderReady(int $orderId): RedirectResponse
    {
        $shopIds = $this->agrivetShopIdsOrAbort();
        $this->assertShopOrderAccess($orderId, $shopIds);

        $preparingStatusId = (int) DB::table('order_status')->where('stat_description', 'Preparing')->value('id');
        $readyStatus = $this->resolveShopReadyStatus($orderId);

        if (! $preparingStatusId || ! $readyStatus) {
            return $this->redirectToOrders()
                ->with('error', 'Unable to mark this order as ready. Check delivery method configuration.');
        }

        $orderShops = DB::table('order_shops')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->get();

        if ($orderShops->isEmpty()) {
            abort(404);
        }

        if ($orderShops->contains(fn ($row) => (int) $row->order_status !== $preparingStatusId)) {
            return $this->redirectToOrders()->with('error', 'Only orders being prepared can be marked as ready.');
        }

        $preparingItemStatusId = (int) DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id');
        $remainingPreparingItems = DB::table('order_items')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->where('item_status', $preparingItemStatusId)
            ->count();

        if ($remainingPreparingItems > 0) {
            return $this->redirectToOrders()
                ->with('error', 'Mark every item as done preparing before marking the order ready.');
        }

        $error = $this->transitionShopOrderRows(
            $orderShops,
            $readyStatus['order_status_id'],
            'Order marked as ready by logistics coordination.',
            'logistics_coordination',
        );
        if ($error) {
            return $this->redirectToOrders()->with('error', $error);
        }

        return $this->redirectToOrders()->with('success', 'Order marked as '.$readyStatus['label'].'.');
    }

    public function donePreparingItem(int $orderId, int $orderItemId): RedirectResponse
    {
        $shopIds = $this->agrivetShopIdsOrAbort();
        $this->assertShopOrderAccess($orderId, $shopIds);

        $preparingItemStatusId = (int) DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id');
        $readyStatus = $this->resolveShopReadyStatus($orderId);

        if (! $preparingItemStatusId || ! $readyStatus || ! $readyStatus['order_item_status_id']) {
            return $this->redirectToOrders()
                ->with('error', 'Unable to update item status. Check delivery method configuration.');
        }

        $orderItem = DB::table('order_items')
            ->where('id', $orderItemId)
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->first();

        if (! $orderItem) {
            abort(404);
        }

        if ((int) $orderItem->item_status !== $preparingItemStatusId) {
            return $this->redirectToOrders()
                ->with('error', 'Only items currently being prepared can be marked as done.');
        }

        DB::table('order_items')
            ->where('id', $orderItemId)
            ->update([
                'item_status' => $readyStatus['order_item_status_id'],
                'updated_at' => now(),
            ]);

        return $this->redirectToOrders()->with('success', 'Item marked as done preparing.');
    }

    public function doneStorePickup(int $orderId): RedirectResponse
    {
        $shopIds = $this->agrivetShopIdsOrAbort();
        $this->assertShopOrderAccess($orderId, $shopIds);

        $error = $this->completePickupFromStore(
            $orderId,
            $shopIds,
            'Customer picked up the order from the store.',
            'logistics_coordination',
        );

        if ($error) {
            return $this->redirectToOrders()->with('error', $error);
        }

        return $this->redirectToOrders()->with('success', 'Order marked as picked up from the store.');
    }

    /**
     * @return array<int, array{id: int, shop_name: string, agrivet_id: int, agrivet_name: string}>
     */
    private function agrivetShops(): array
    {
        return Shop::query()
            ->whereNotNull('agrivet_id')
            ->with('agrivet:id,name')
            ->orderBy('shop_name')
            ->get(['id', 'shop_name', 'agrivet_id'])
            ->map(fn (Shop $shop) => [
                'id' => (int) $shop->id,
                'shop_name' => $shop->shop_name,
                'agrivet_id' => (int) $shop->agrivet_id,
                'agrivet_name' => $shop->agrivet?->name ?? '',
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array{id: int, shop_name: string, agrivet_id: int, agrivet_name: string}>  $shops
     * @return array<int, array{id: int, name: string}>
     */
    private function agrivetsFromShops(array $shops): array
    {
        return collect($shops)
            ->unique('agrivet_id')
            ->map(fn (array $shop) => [
                'id' => $shop['agrivet_id'],
                'name' => $shop['agrivet_name'] !== '' ? $shop['agrivet_name'] : 'Agrivet #'.$shop['agrivet_id'],
            ])
            ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    /**
     * @return array<int>
     */
    private function agrivetShopIdsOrAbort(): array
    {
        $ids = Shop::query()
            ->whereNotNull('agrivet_id')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        abort_if($ids === [], 404);

        return $ids;
    }

    private function redirectToOrders(): RedirectResponse
    {
        $route = auth()->user()?->user_type === User::TYPE_ADMIN
            ? 'dashboard.admin.logistics.orders'
            : 'dashboard.super-admin.logistics.orders';

        return redirect()->route($route);
    }

    /**
     * @return array<string, mixed>
     */
    private function productPayload(Item $item): array
    {
        $images = $this->productImageUrls($item->item_images);

        return [
            'id' => (int) $item->id,
            'name' => $item->item_name,
            'description' => $item->item_description,
            'customer_price' => (float) $item->effective_price,
            'store_price' => (float) $item->getVendorUnitPrice(),
            'list_price' => (float) $item->list_price,
            'discount_percent' => (float) $item->active_discount_percent,
            'quantity' => (int) $item->item_quantity,
            'status' => $item->item_status,
            'sold_count' => (int) ($item->sold_count ?? 0),
            'is_bundle' => (bool) $item->is_bundle,
            'weight' => $item->weight !== null ? (float) $item->weight : null,
            'metric' => $item->metric,
            'category_name' => $item->categoryRelation?->category_name,
            'average_rating' => $item->average_rating !== null ? (float) $item->average_rating : 0,
            'total_reviews' => (int) ($item->total_reviews ?? 0),
            'images' => $images,
            'shop' => [
                'id' => $item->shop ? (int) $item->shop->id : null,
                'name' => $item->shop?->shop_name ?? 'Store',
                'status' => $item->shop?->shop_status,
            ],
            'agrivet' => [
                'id' => $item->shop?->agrivet ? (int) $item->shop->agrivet->id : null,
                'name' => $item->shop?->agrivet?->name ?? '',
                'status' => $item->shop?->agrivet?->status,
            ],
            'updated_at' => $item->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<int, string>
     */
    private function productImageUrls(mixed $images): array
    {
        if ($images === null || $images === '') {
            return [];
        }

        $decoded = is_string($images) ? json_decode($images, true) : $images;
        if (! is_array($decoded)) {
            return [];
        }

        $urls = [];
        foreach ($decoded as $image) {
            if (is_array($image)) {
                $image = $image['url'] ?? $image['path'] ?? null;
            }
            if (! is_string($image) || trim($image) === '') {
                continue;
            }
            if (preg_match('/^https?:\/\//', $image) || str_starts_with($image, '/storage/') || str_contains($image, 'products/')) {
                $url = PublicStorage::url($image);
            } else {
                $url = PublicStorage::url('products/'.basename($image));
            }
            if ($url) {
                $urls[] = $url;
            }
        }

        return $urls;
    }
}
