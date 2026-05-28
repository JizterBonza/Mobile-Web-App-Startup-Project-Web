<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use App\Http\Controllers\Concerns\CreatesProductCatalogEntry;
use App\Http\Controllers\Concerns\ManagesShopOrders;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\ProductCatalog;
use App\Models\SubCategory;

class DashboardController extends Controller
{
    use CreatesProductCatalogEntry;
    use ManagesShopOrders;
    public function superAdmin()
    {
        // User counts grouped by type and status
        $userRows = DB::table('users')
            ->select('user_type', 'status', DB::raw('count(*) as count'))
            ->whereIn('user_type', ['admin', 'vendor', 'veterinarian', 'rider'])
            ->groupBy('user_type', 'status')
            ->get()
            ->groupBy('user_type');

        $roleStat = function (string $type) use ($userRows): array {
            $rows = $userRows->get($type, collect());
            $total = $rows->sum('count');
            $active = $rows->firstWhere('status', 'active')?->count ?? 0;
            return ['total' => (int) $total, 'active' => (int) $active, 'inactive' => (int) ($total - $active)];
        };

        // Agrivet counts
        $agrivetRows = DB::table('agrivets')
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get();
        $agrivetTotal = (int) $agrivetRows->sum('count');
        $agrivetActive = (int) ($agrivetRows->firstWhere('status', 'active')?->count ?? 0);

        // Store metrics
        $storesTotal = (int) DB::table('shops')->count();
        $storesActive = (int) DB::table('shops')->where('shop_status', 'active')->count();

        // Order metrics
        $ordersTotal = (int) DB::table('orders')->count();
        $ordersMonth = (int) DB::table('orders')
            ->whereMonth('ordered_at', now()->month)
            ->whereYear('ordered_at', now()->year)
            ->count();

        $itemsSold = (int) DB::table('order_items')
            ->where('item_status', 'delivered')
            ->sum('quantity');

        $avgItemsPerOrder = $ordersTotal > 0 ? round($itemsSold / $ordersTotal, 1) : 0;

        // Top 5 stores by delivered order revenue
        $topStores = DB::table('shops')
            ->join('agrivets', 'shops.agrivet_id', '=', 'agrivets.id')
            ->leftJoin('order_items', function ($join) {
                $join->on('order_items.shop_id', '=', 'shops.id')
                     ->where('order_items.item_status', '=', 'delivered');
            })
            ->leftJoin('items', 'items.shop_id', '=', 'shops.id')
            ->select(
                'shops.id',
                'shops.shop_name as name',
                'agrivets.name as agrivetName',
                DB::raw('coalesce(count(distinct order_items.order_id), 0) as orders'),
                DB::raw('count(distinct items.id) as products'),
                DB::raw('coalesce(sum(order_items.quantity * order_items.price_at_purchase), 0) as revenue')
            )
            ->groupBy('shops.id', 'shops.shop_name', 'agrivets.name')
            ->orderByDesc('orders')
            ->limit(5)
            ->get()
            ->filter(fn($s) => $s->orders > 0)
            ->map(fn($s) => [
                'id'          => $s->id,
                'name'        => $s->name,
                'agrivetName' => $s->agrivetName,
                'orders'      => (int) $s->orders,
                'products'    => (int) $s->products,
                'revenue'     => '$' . number_format($s->revenue, 2),
            ])
            ->values();

        // Top 5 riders by completed deliveries
        $topRiders = DB::table('users')
            ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
            ->leftJoin('order_shops', 'order_shops.rider_id', '=', 'users.id')
            ->where('users.user_type', 'rider')
            ->select(
                'users.id',
                DB::raw("concat(user_details.first_name, ' ', user_details.last_name) as name"),
                DB::raw('count(order_shops.id) as deliveries')
            )
            ->groupBy('users.id', 'user_details.first_name', 'user_details.last_name')
            ->orderByDesc('deliveries')
            ->limit(5)
            ->get()
            ->filter(fn($r) => $r->deliveries > 0)
            ->map(fn($r) => [
                'id'          => $r->id,
                'name'        => $r->name,
                'deliveries'  => (int) $r->deliveries,
                'rating'      => 'N/A',
                'successRate' => 100,
            ])
            ->values();

        return Inertia::render('Dashboard/SuperAdminDashboard', [
            'insights' => [
                'userStats' => [
                    'admins'        => $roleStat('admin'),
                    'agrivets'      => ['total' => $agrivetTotal, 'active' => $agrivetActive, 'inactive' => $agrivetTotal - $agrivetActive],
                    'vendors'       => $roleStat('vendor'),
                    'veterinarians' => $roleStat('veterinarian'),
                    'riders'        => $roleStat('rider'),
                ],
                'orderMetrics' => [
                    'storesTotal'       => $storesTotal,
                    'storesActive'      => $storesActive,
                    'storesTrend'       => '',
                    'ordersTotal'       => number_format($ordersTotal),
                    'ordersMonth'       => number_format($ordersMonth),
                    'ordersTrend'       => '',
                    'itemsSold'         => number_format($itemsSold),
                    'itemsTrend'        => '',
                    'avgItemsPerOrder'  => (string) $avgItemsPerOrder,
                ],
                'topStores'         => $topStores,
                'topRiders'         => $topRiders,
                'notificationCount' => 0,
            ],
        ]);
    }

    public function ownerManager()
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;

        if (!$agrivet) {
            return Inertia::render('Dashboard/OwnerManagerDashboard', [
                'agrivet' => null,
                'shops'   => [],
                'stats'   => [],
            ]);
        }

        $shops = $agrivet->shops;
        $shopIds = $shops->pluck('id')->toArray();

        if (empty($shopIds)) {
            return Inertia::render('Dashboard/OwnerManagerDashboard', [
                'agrivet' => $agrivet,
                'shops'   => [],
                'stats'   => [],
            ]);
        }

        $totalOrders = (int) DB::table('order_items')
            ->whereIn('shop_id', $shopIds)
            ->distinct('order_id')
            ->count('order_id');

        $itemsSold = (int) DB::table('order_items')
            ->whereIn('shop_id', $shopIds)
            ->where('item_status', 'delivered')
            ->sum('quantity');

        $totalRevenue = (float) DB::table('order_items')
            ->whereIn('shop_id', $shopIds)
            ->where('item_status', 'delivered')
            ->selectRaw('COALESCE(SUM(quantity * price_at_purchase), 0) as total')
            ->value('total');

        $avgRating = $shops->avg('average_rating') ?? 0;

        $storeStats = $shops->map(function ($shop) {
            $orders = (int) DB::table('order_items')
                ->where('shop_id', $shop->id)
                ->distinct('order_id')
                ->count('order_id');
            $revenue = (float) DB::table('order_items')
                ->where('shop_id', $shop->id)
                ->where('item_status', 'delivered')
                ->selectRaw('COALESCE(SUM(quantity * price_at_purchase), 0) as total')
                ->value('total');
            return [
                'id'             => $shop->id,
                'shop_name'      => $shop->shop_name,
                'shop_status'    => $shop->shop_status,
                'average_rating' => $shop->average_rating,
                'orders'         => $orders,
                'revenue'        => $revenue,
            ];
        })->values()->toArray();

        $topProducts = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->whereIn('order_items.shop_id', $shopIds)
            ->where('order_items.item_status', 'delivered')
            ->select(
                'items.item_name as name',
                DB::raw('COALESCE(SUM(order_items.quantity), 0) as quantity'),
                DB::raw('COALESCE(SUM(order_items.quantity * order_items.price_at_purchase), 0) as revenue'),
            )
            ->groupBy('items.id', 'items.item_name')
            ->orderByDesc('quantity')
            ->limit(10)
            ->get()
            ->map(fn($p) => [
                'name'     => $p->name,
                'quantity' => (int) $p->quantity,
                'revenue'  => (float) $p->revenue,
            ])
            ->toArray();

        $customerRows = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->whereIn('order_items.shop_id', $shopIds)
            ->select('orders.user_id', DB::raw('COUNT(DISTINCT orders.id) as order_count'))
            ->groupBy('orders.user_id')
            ->get();

        $totalCustomers = $customerRows->count();
        $returningCustomers = $customerRows->filter(fn($c) => $c->order_count > 1)->count();
        $newCustomers = $totalCustomers - $returningCustomers;

        $topBuyers = DB::table('orders')
            ->join('order_items', 'orders.id', '=', 'order_items.order_id')
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
            ->whereIn('order_items.shop_id', $shopIds)
            ->select(
                'orders.user_id',
                DB::raw("CONCAT(user_details.first_name, ' ', user_details.last_name) as name"),
                DB::raw('COUNT(DISTINCT orders.id) as total_orders'),
                DB::raw('COALESCE(SUM(order_items.quantity * order_items.price_at_purchase), 0) as total_spent'),
            )
            ->groupBy('orders.user_id', 'user_details.first_name', 'user_details.last_name')
            ->orderByDesc('total_spent')
            ->limit(10)
            ->get()
            ->map(fn($b) => [
                'name'         => $b->name,
                'total_orders' => (int) $b->total_orders,
                'total_spent'  => (float) $b->total_spent,
            ])
            ->toArray();

        return Inertia::render('Dashboard/OwnerManagerDashboard', [
            'agrivet' => $agrivet,
            'shops'   => $shops,
            'stats'   => [
                'total_orders'        => $totalOrders,
                'items_sold'          => $itemsSold,
                'total_revenue'       => $totalRevenue,
                'average_rating'      => round((float) $avgRating, 1),
                'store_stats'         => $storeStats,
                'top_products'        => $topProducts,
                'new_customers'       => $newCustomers,
                'returning_customers' => $returningCustomers,
                'total_customers'     => $totalCustomers,
                'top_buyers'          => $topBuyers,
                'revenue_by_category' => [],
            ],
        ]);
    }

    public function ownerManagerStores()
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;

        return Inertia::render('Dashboard/OwnerManagerStores', [
            'agrivet' => $agrivet,
            'shops'   => $agrivet ? $agrivet->shops : [],
        ]);
    }

    public function ownerManagerStoreInformation($shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        if (! $agrivet) {
            return redirect()->route('dashboard.owner-manager.stores');
        }

        return app(AgrivetController::class)->showStoreInformation($agrivet->id, $shopId);
    }

    public function ownerManagerUpdateShop(Request $request, $shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return app(AgrivetController::class)->updateShop($request, $agrivet->id, $shopId);
    }

    public function ownerManagerUpdateShopCoverPhoto(Request $request, $shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return app(AgrivetController::class)->updateShopCoverPhoto($request, $agrivet->id, $shopId);
    }

    public function ownerManagerReassignVendor(Request $request, $shopId, $vendorId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return app(AgrivetController::class)->reassignVendor($request, $agrivet->id, $shopId, $vendorId);
    }

    public function ownerManagerStoreVendor(Request $request, $shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return app(AgrivetController::class)->storeVendor($request, $agrivet->id, $shopId);
    }

    public function ownerManagerStoreShopListing(Request $request, $shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return app(AgrivetController::class)->storeShopListing($request, $agrivet->id, $shopId);
    }

    public function ownerManagerProductsCreate($shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        $shop = $agrivet->shops()->where('id', $shopId)->firstOrFail();

        return Inertia::render('Dashboard/Vendor/RegisterProduct', array_merge(
            $this->productCatalogFormProps(),
            [
                'shop' => [
                    'id' => $shop->id,
                    'shop_name' => $shop->shop_name,
                ],
                'authUser' => [
                    'name' => auth()->user()->name,
                    'role' => 'Owner / Manager',
                ],
                'layoutType' => 'owner_manager',
                'submitUrl' => "/dashboard/owner-manager/stores/{$shopId}/product-catalog",
                'backUrl' => "/dashboard/owner-manager/stores/{$shopId}/store-information?tab=products",
                'requiresApproval' => true,
            ]
        ));
    }

    public function ownerManagerProductCatalogStore(Request $request, $shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        $agrivet->shops()->where('id', $shopId)->firstOrFail();

        $catalog = $this->createProductCatalogFromRequest($request, ProductCatalog::STATUS_PENDING);

        ActivityLog::log(
            'created',
            "Product registration request submitted: {$request->product_name}",
            $catalog,
            null,
            $catalog->toArray()
        );

        return redirect()
            ->to(route('dashboard.owner-manager.stores.store-information', $shopId) . '?tab=products')
            ->with('success', 'Your product registration request has been submitted and is pending approval.');
    }

    /**
     * @return array<string, mixed>
     */
    private function productCatalogFormProps(): array
    {
        $categories = Category::where('status', 'active')
            ->orderBy('category_name')
            ->get()
            ->map(fn ($category) => [
                'id' => $category->id,
                'name' => $category->category_name,
            ]);

        $subCategories = SubCategory::where('sub_category_status', 'active')
            ->orderBy('sub_category_name')
            ->get()
            ->map(fn ($subCategory) => [
                'id' => $subCategory->id,
                'name' => $subCategory->sub_category_name,
            ]);

        return [
            'categories' => $categories,
            'subCategories' => $subCategories,
        ];
    }

    public function ownerManagerOrders()
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;
        $orders = [];

        $deliveryMethods = [];
        $preparingItemStatusId = $this->preparingItemStatusId();

        if ($agrivet) {
            $shopIds = $agrivet->shops()->pluck('id')->all();
            if (! empty($shopIds)) {
                $orders = $this->buildShopOrders($shopIds, $preparingItemStatusId);
            }
            $deliveryMethods = $this->activeDeliveryMethods();
        }

        return Inertia::render('Dashboard/OwnerManagerOrders', [
            'agrivet'               => $agrivet,
            'orders'                => $orders,
            'deliveryMethods'       => $deliveryMethods,
            'preparingItemStatusId' => $preparingItemStatusId ?: null,
        ]);
    }

    public function ownerManagerAcceptOrder(int $orderId)
    {
        $shopIds = $this->ownerManagerShopIdsOrAbort();
        $this->assertShopOrderAccess($orderId, $shopIds);

        $pendingStatusId = (int) DB::table('order_status')->where('stat_description', 'Pending')->value('id');
        $preparingStatusId = (int) DB::table('order_status')->where('stat_description', 'Preparing')->value('id');

        if (! $pendingStatusId || ! $preparingStatusId) {
            return redirect()->route('dashboard.owner-manager.orders')
                ->with('error', 'Order status configuration is missing.');
        }

        $orderShops = DB::table('order_shops')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->get();

        if ($orderShops->isEmpty()) {
            abort(404);
        }

        if ($orderShops->contains(fn ($row) => (int) $row->order_status !== $pendingStatusId)) {
            return redirect()->route('dashboard.owner-manager.orders')
                ->with('error', 'Only pending orders can be accepted.');
        }

        $now = now();

        DB::table('order_shops')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->update(['order_status' => $preparingStatusId, 'updated_at' => $now]);

        $preparingItemStatusId = DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id');
        if ($preparingItemStatusId) {
            DB::table('order_items')
                ->where('order_id', $orderId)
                ->whereIn('shop_id', $shopIds)
                ->update(['item_status' => (int) $preparingItemStatusId, 'updated_at' => $now]);
        }

        $this->logShopOrderEvent(
            $orderId,
            'status_changed',
            'Pending',
            'Preparing',
            'Order accepted by owner/manager.'
        );

        return redirect()->route('dashboard.owner-manager.orders')
            ->with('success', 'Order accepted successfully.');
    }

    public function ownerManagerDeclineOrder(Request $request, int $orderId)
    {
        $shopIds = $this->ownerManagerShopIdsOrAbort();
        $this->assertShopOrderAccess($orderId, $shopIds);

        $request->validate([
            'decline_reason' => 'required|string|max:1000',
        ]);

        $pendingStatusId = (int) DB::table('order_status')->where('stat_description', 'Pending')->value('id');
        $cancelledStatusId = (int) DB::table('order_status')->where('stat_description', 'Cancelled')->value('id');

        if (! $pendingStatusId || ! $cancelledStatusId) {
            return redirect()->route('dashboard.owner-manager.orders')
                ->with('error', 'Order status configuration is missing.');
        }

        $orderShops = DB::table('order_shops')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->get();

        if ($orderShops->isEmpty()) {
            abort(404);
        }

        if ($orderShops->contains(fn ($row) => (int) $row->order_status !== $pendingStatusId)) {
            return redirect()->route('dashboard.owner-manager.orders')
                ->with('error', 'Only pending orders can be declined.');
        }

        $now = now();
        $declineReason = trim($request->input('decline_reason'));

        DB::table('order_shops')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->update(['order_status' => $cancelledStatusId, 'updated_at' => $now]);

        $cancelledItemStatusId = DB::table('order_item_status')->where('stat_description', 'Cancelled')->value('id');
        if ($cancelledItemStatusId) {
            DB::table('order_items')
                ->where('order_id', $orderId)
                ->whereIn('shop_id', $shopIds)
                ->update(['item_status' => (int) $cancelledItemStatusId, 'updated_at' => $now]);
        }

        $this->logShopOrderEvent(
            $orderId,
            'cancelled',
            'Pending',
            'Cancelled',
            $declineReason
        );

        return redirect()->route('dashboard.owner-manager.orders')
            ->with('success', 'Order declined successfully.');
    }

    public function ownerManagerMarkOrderReady(int $orderId)
    {
        $shopIds = $this->ownerManagerShopIdsOrAbort();
        $this->assertShopOrderAccess($orderId, $shopIds);

        $preparingStatusId = (int) DB::table('order_status')->where('stat_description', 'Preparing')->value('id');
        $readyStatus = $this->resolveShopReadyStatus($orderId);

        if (! $preparingStatusId || ! $readyStatus) {
            return redirect()->route('dashboard.owner-manager.orders')
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
            return redirect()->route('dashboard.owner-manager.orders')
                ->with('error', 'Only orders being prepared can be marked as ready.');
        }

        $preparingItemStatusId = (int) DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id');
        $remainingPreparingItems = DB::table('order_items')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->where('item_status', $preparingItemStatusId)
            ->count();

        if ($remainingPreparingItems > 0) {
            return redirect()->route('dashboard.owner-manager.orders')
                ->with('error', 'Mark every item as done preparing before marking the order ready.');
        }

        $now = now();

        DB::table('order_shops')
            ->where('order_id', $orderId)
            ->whereIn('shop_id', $shopIds)
            ->update(['order_status' => $readyStatus['order_status_id'], 'updated_at' => $now]);

        $this->logShopOrderEvent(
            $orderId,
            'status_changed',
            'Preparing',
            $readyStatus['label'],
            'Order marked as ready by owner/manager.'
        );

        return redirect()->route('dashboard.owner-manager.orders')
            ->with('success', 'Order marked as ' . $readyStatus['label'] . '.');
    }

    public function ownerManagerDonePreparingItem(int $orderId, int $orderItemId)
    {
        $shopIds = $this->ownerManagerShopIdsOrAbort();
        $this->assertShopOrderAccess($orderId, $shopIds);

        $preparingItemStatusId = (int) DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id');
        $readyStatus = $this->resolveShopReadyStatus($orderId);

        if (! $preparingItemStatusId || ! $readyStatus || ! $readyStatus['order_item_status_id']) {
            return redirect()->route('dashboard.owner-manager.orders')
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
            return redirect()->route('dashboard.owner-manager.orders')
                ->with('error', 'Only items currently being prepared can be marked as done.');
        }

        DB::table('order_items')
            ->where('id', $orderItemId)
            ->update([
                'item_status' => $readyStatus['order_item_status_id'],
                'updated_at'  => now(),
            ]);

        return redirect()->route('dashboard.owner-manager.orders')
            ->with('success', 'Item marked as done preparing.');
    }

    public function admin()
    {
        $userRows = DB::table('users')
            ->select('user_type', 'status', DB::raw('count(*) as count'))
            ->whereIn('user_type', ['admin', 'vendor', 'veterinarian', 'rider'])
            ->groupBy('user_type', 'status')
            ->get()
            ->groupBy('user_type');

        $roleStat = function (string $type) use ($userRows): array {
            $rows = $userRows->get($type, collect());
            $total = $rows->sum('count');
            $active = $rows->firstWhere('status', 'active')?->count ?? 0;
            return ['total' => (int) $total, 'active' => (int) $active, 'inactive' => (int) ($total - $active)];
        };

        $agrivetRows = DB::table('agrivets')
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get();
        $agrivetTotal = (int) $agrivetRows->sum('count');
        $agrivetActive = (int) ($agrivetRows->firstWhere('status', 'active')?->count ?? 0);

        $storesTotal = (int) DB::table('shops')->count();
        $storesActive = (int) DB::table('shops')->where('shop_status', 'active')->count();

        $ordersTotal = (int) DB::table('orders')->count();
        $ordersMonth = (int) DB::table('orders')
            ->whereMonth('ordered_at', now()->month)
            ->whereYear('ordered_at', now()->year)
            ->count();

        $itemsSold = (int) DB::table('order_items')
            ->where('item_status', 'delivered')
            ->sum('quantity');

        $avgItemsPerOrder = $ordersTotal > 0 ? round($itemsSold / $ordersTotal, 1) : 0;

        $topStores = DB::table('shops')
            ->join('agrivets', 'shops.agrivet_id', '=', 'agrivets.id')
            ->leftJoin('order_items', function ($join) {
                $join->on('order_items.shop_id', '=', 'shops.id')
                     ->where('order_items.item_status', '=', 'delivered');
            })
            ->leftJoin('items', 'items.shop_id', '=', 'shops.id')
            ->select(
                'shops.id',
                'shops.shop_name as name',
                'agrivets.name as agrivetName',
                DB::raw('coalesce(count(distinct order_items.order_id), 0) as orders'),
                DB::raw('count(distinct items.id) as products'),
                DB::raw('coalesce(sum(order_items.quantity * order_items.price_at_purchase), 0) as revenue')
            )
            ->groupBy('shops.id', 'shops.shop_name', 'agrivets.name')
            ->orderByDesc('orders')
            ->limit(5)
            ->get()
            ->filter(fn($s) => $s->orders > 0)
            ->map(fn($s) => [
                'id'          => $s->id,
                'name'        => $s->name,
                'agrivetName' => $s->agrivetName,
                'orders'      => (int) $s->orders,
                'products'    => (int) $s->products,
                'revenue'     => '$' . number_format($s->revenue, 2),
            ])
            ->values();

        $topRiders = DB::table('users')
            ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
            ->leftJoin('order_shops', 'order_shops.rider_id', '=', 'users.id')
            ->where('users.user_type', 'rider')
            ->select(
                'users.id',
                DB::raw("concat(user_details.first_name, ' ', user_details.last_name) as name"),
                DB::raw('count(order_shops.id) as deliveries')
            )
            ->groupBy('users.id', 'user_details.first_name', 'user_details.last_name')
            ->orderByDesc('deliveries')
            ->limit(5)
            ->get()
            ->filter(fn($r) => $r->deliveries > 0)
            ->map(fn($r) => [
                'id'          => $r->id,
                'name'        => $r->name,
                'deliveries'  => (int) $r->deliveries,
                'rating'      => 'N/A',
                'successRate' => 100,
            ])
            ->values();

        return Inertia::render('Dashboard/AdminDashboard', [
            'insights' => [
                'userStats' => [
                    'admins'        => $roleStat('admin'),
                    'agrivets'      => ['total' => $agrivetTotal, 'active' => $agrivetActive, 'inactive' => $agrivetTotal - $agrivetActive],
                    'vendors'       => $roleStat('vendor'),
                    'veterinarians' => $roleStat('veterinarian'),
                    'riders'        => $roleStat('rider'),
                ],
                'orderMetrics' => [
                    'storesTotal'      => $storesTotal,
                    'storesActive'     => $storesActive,
                    'storesTrend'      => '',
                    'ordersTotal'      => number_format($ordersTotal),
                    'ordersMonth'      => number_format($ordersMonth),
                    'ordersTrend'      => '',
                    'itemsSold'        => number_format($itemsSold),
                    'itemsTrend'       => '',
                    'avgItemsPerOrder' => (string) $avgItemsPerOrder,
                ],
                'topStores'         => $topStores,
                'topRiders'         => $topRiders,
                'notificationCount' => 0,
            ],
        ]);
    }

    private function ownerManagerShopIdsOrAbort(): array
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return $agrivet->shops()->pluck('id')->all();
    }
}
