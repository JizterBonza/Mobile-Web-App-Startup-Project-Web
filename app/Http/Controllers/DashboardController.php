<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
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
            'shops'   => $shops->values(),
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

    public function admin()
    {
        $pendingOrders = (int) DB::table('order_items')
            ->where('item_status', 'ordered')
            ->count();

        $activeVendors = (int) DB::table('users')
            ->where('user_type', 'vendor')
            ->where('status', 'active')
            ->count();

        $activeVeterinarians = (int) DB::table('users')
            ->where('user_type', 'veterinarian')
            ->where('status', 'active')
            ->count();

        return Inertia::render('Dashboard/AdminDashboard', [
            'stats' => [
                'pending_orders'       => $pendingOrders,
                'active_vendors'       => $activeVendors,
                'active_veterinarians' => $activeVeterinarians,
                'support_tickets'      => 0,
            ],
        ]);
    }
}
