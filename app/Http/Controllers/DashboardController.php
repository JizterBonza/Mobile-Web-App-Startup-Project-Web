<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class DashboardController extends Controller
{
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

    public function ownerManagerOrders()
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;
        $orders = [];

        $deliveryMethods = [];
        $preparingItemStatusId = Schema::hasTable('order_item_status')
            ? (int) (DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id') ?? 0)
            : 0;

        if ($agrivet) {
            $shopIds = $agrivet->shops()->pluck('id')->all();
            if (! empty($shopIds)) {
                $orders = $this->buildOwnerManagerOrders($shopIds, $preparingItemStatusId);
            }

            if (Schema::hasTable('delivery_method')) {
                $deliveryMethods = DB::table('delivery_method')
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
        $this->assertOwnerManagerOrderAccess($orderId, $shopIds);

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

        $this->logOwnerManagerOrderEvent(
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
        $this->assertOwnerManagerOrderAccess($orderId, $shopIds);

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

        $this->logOwnerManagerOrderEvent(
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
        $this->assertOwnerManagerOrderAccess($orderId, $shopIds);

        $preparingStatusId = (int) DB::table('order_status')->where('stat_description', 'Preparing')->value('id');
        $readyStatus = $this->resolveOwnerManagerReadyStatus($orderId);

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

        $this->logOwnerManagerOrderEvent(
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
        $this->assertOwnerManagerOrderAccess($orderId, $shopIds);

        $preparingItemStatusId = (int) DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id');
        $readyStatus = $this->resolveOwnerManagerReadyStatus($orderId);

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

    /**
     * Orders for owner/manager UI (all shops under the agrivet).
     *
     * @param  array<int>  $shopIds
     * @return array<int, array<string, mixed>>
     */
    private function buildOwnerManagerOrders(array $shopIds, int $preparingItemStatusId = 0): array
    {
        // Orders are tied to shops via order_shops and order_items.shop_id (not items.shop_id).
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
            $statusMeta = $this->mapOwnerManagerOrderStatus($row->status_description ?? '');
            $products = ($itemsByOrder->get($row->id) ?? collect())->map(function ($item) {
                $thumbnail = $this->firstItemImageUrl($item->item_images);

                return [
                    'id'                    => (int) $item->id,
                    'name'                  => $item->item_name,
                    'quantity'              => (int) $item->quantity,
                    'price'                 => (float) $item->price_at_purchase,
                    'thumbnail'             => $thumbnail,
                    'itemStatusId'          => (int) $item->item_status_id,
                    'itemStatus'            => $item->item_status_description ?? 'Unknown',
                ];
            })->values()->all();

            $allItemsDonePreparing = $preparingItemStatusId > 0
                && count($products) > 0
                && collect($products)->every(fn (array $product) => (int) $product['itemStatusId'] !== $preparingItemStatusId);

            $rider = $ridersByOrder->get($row->id);
            $riderDetails = null;
            if ($rider) {
                $riderDetails = [
                    'name'            => trim(($rider->rider_first_name ?? '') . ' ' . ($rider->rider_last_name ?? '')),
                    'phone'           => $rider->rider_phone ?? '',
                    'vehicleType'     => $rider->rider_vehicle_type ?? '—',
                    'plateNumber'     => '—',
                    'profilePicture'  => $rider->rider_profile_image_url ?: $rider->rider_avatar,
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
                'id'                      => (int) $row->id,
                'orderNumber'             => 'ORD-' . $row->id,
                'shopIds'                 => $shopIdsByOrder->get($row->id, []),
                'customerName'            => trim(($row->first_name ?? '') . ' ' . ($row->last_name ?? '')),
                'customerPhone'           => $customerPhone,
                'customerProfilePicture'  => $row->profile_image_url ?: $row->avatar,
                'dateOfOrder'             => $row->ordered_at,
                'products'                => $products,
                'deliveryAddress'         => [
                    'street'   => $row->street_address ?? '',
                    'barangay' => $row->barangay ?? '',
                    'city'     => $row->city_municipality ?? '',
                    'province' => $row->province ?? '',
                ],
                'status'                  => $statusMeta['status'],
                'deliveryMethodId'        => $deliveryMethodId,
                'deliveryMethodName'      => $deliveryMethodName,
                'deliveryMethod'          => $deliveryMethodId ? [
                    'id'   => $deliveryMethodId,
                    'name' => $deliveryMethodName ?? 'Unknown',
                    'info' => $deliveryMethodInfo,
                ] : null,
                'readyButtonLabel'        => $this->readyButtonLabelForDeliveryMethod($deliveryMethodId),
                'allItemsDonePreparing'   => $allItemsDonePreparing,
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
     * @return array{status: string, isSuccessful: bool|null}
     */
    private function mapOwnerManagerOrderStatus(string $description): array
    {
        $d = strtolower(trim($description));

        if (str_contains($d, 'cancel')) {
            return ['status' => 'completed', 'isSuccessful' => false];
        }
        // Must run before "delivered" — "ready for delivery" contains "deliver"
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
    private function resolveOwnerManagerReadyStatus(int $orderId): ?array
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

    private function readyButtonLabelForDeliveryMethod(?int $deliveryMethodId): string
    {
        return match ($deliveryMethodId) {
            1       => 'Mark Ready for Delivery',
            2       => 'Mark Ready for Drop off',
            3       => 'Mark Ready for Pickup',
            default => 'Mark Order Ready',
        };
    }

    private function ownerManagerShopIdsOrAbort(): array
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return $agrivet->shops()->pluck('id')->all();
    }

    /**
     * @param  array<int>  $shopIds
     */
    private function assertOwnerManagerOrderAccess(int $orderId, array $shopIds): void
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

    private function logOwnerManagerOrderEvent(
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

    private function firstItemImageUrl(mixed $itemImages): ?string
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
