<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
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
use App\Http\Controllers\SupportTicketController;
use App\Models\Zone;

class DashboardController extends Controller
{
    use CreatesProductCatalogEntry;
    use ManagesShopOrders;
    public function superAdmin()
    {
        // User counts grouped by type and status
        $userRows = DB::table('users')
            ->select('user_type', 'status', DB::raw('count(*) as count'))
            ->whereIn('user_type', ['super_admin', 'admin', 'vendor', 'veterinarian', 'rider'])
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

        $deliveredItemStatusId = $this->deliveredItemStatusId();

        $itemsSold = (int) DB::table('order_items')
            ->where('item_status', $deliveredItemStatusId)
            ->sum('quantity');

        $avgItemsPerOrder = $ordersTotal > 0 ? round($itemsSold / $ordersTotal, 1) : 0;

        // Top 5 stores by delivered order revenue
        $topStores = DB::table('shops')
            ->join('agrivets', 'shops.agrivet_id', '=', 'agrivets.id')
            ->leftJoin('order_items', function ($join) use ($deliveredItemStatusId) {
                $join->on('order_items.shop_id', '=', 'shops.id')
                     ->where('order_items.item_status', '=', $deliveredItemStatusId);
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
                    'superAdmins'   => $roleStat('super_admin'),
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

    public function ownerManager(Request $request)
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;
        $period = $this->ownerManagerPeriod($request);

        if (!$agrivet) {
            return Inertia::render('Dashboard/OwnerManagerDashboard', [
                'agrivet' => null,
                'shops'   => [],
                'stats'   => $this->emptyOwnerManagerStats($period),
                'period'  => $period,
            ]);
        }

        $shops = $agrivet->shops;
        $shopIds = $shops->pluck('id')->toArray();

        if (empty($shopIds)) {
            return Inertia::render('Dashboard/OwnerManagerDashboard', [
                'agrivet' => $agrivet,
                'shops'   => [],
                'stats'   => $this->emptyOwnerManagerStats($period),
                'period'  => $period,
            ]);
        }

        [$start, $end] = $this->ownerManagerPeriodRange($period);
        [$prevStart, $prevEnd] = $this->ownerManagerPreviousPeriodRange($period);
        $deliveredItemStatusId = $this->deliveredItemStatusId();

        $currentMetrics = $this->ownerManagerKeyMetrics($shopIds, $deliveredItemStatusId, $start, $end);
        $previousMetrics = $this->ownerManagerKeyMetrics($shopIds, $deliveredItemStatusId, $prevStart, $prevEnd);

        $avgRating = $shops->avg('average_rating') ?? 0;

        $currentStoreMetrics = $this->ownerManagerShopMetricMap($shopIds, $deliveredItemStatusId, $start, $end);
        $previousStoreMetrics = $this->ownerManagerShopMetricMap($shopIds, $deliveredItemStatusId, $prevStart, $prevEnd);

        $storeStats = $shops->map(function ($shop) use ($currentStoreMetrics, $previousStoreMetrics) {
            $orders = (int) ($currentStoreMetrics['orders'][$shop->id] ?? 0);
            $revenue = (float) ($currentStoreMetrics['revenue'][$shop->id] ?? 0);
            $previousRevenue = (float) ($previousStoreMetrics['revenue'][$shop->id] ?? 0);

            return [
                'id'             => $shop->id,
                'shop_name'      => $shop->shop_name,
                'shop_status'    => $shop->shop_status,
                'average_rating' => $shop->average_rating,
                'orders'         => $orders,
                'revenue'        => $revenue,
                'wallet'         => (float) ($shop->wallet_balance ?? 0),
                'growth'         => $this->percentageChange($revenue, $previousRevenue),
            ];
        })->values()->toArray();

        $topProducts = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->whereIn('order_items.shop_id', $shopIds)
            ->where('order_items.item_status', $deliveredItemStatusId)
            ->whereBetween('order_items.created_at', [$start, $end])
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
            ->whereBetween('order_items.created_at', [$start, $end])
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
            ->whereBetween('order_items.created_at', [$start, $end])
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

        $revenueByCategory = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->leftJoin('category', 'items.category', '=', 'category.id')
            ->whereIn('order_items.shop_id', $shopIds)
            ->where('order_items.item_status', $deliveredItemStatusId)
            ->whereBetween('order_items.created_at', [$start, $end])
            ->select(
                DB::raw("COALESCE(category.category_name, 'Uncategorized') as category"),
                DB::raw('COALESCE(SUM(order_items.quantity * order_items.price_at_purchase), 0) as revenue'),
            )
            ->groupBy('category.id', 'category.category_name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get()
            ->map(fn($row) => [
                'category' => $row->category,
                'revenue'  => (float) $row->revenue,
            ])
            ->toArray();

        return Inertia::render('Dashboard/OwnerManagerDashboard', [
            'agrivet' => $agrivet,
            'shops'   => $shops,
            'period'  => $period,
            'stats'   => [
                'total_orders'        => $currentMetrics['orders'],
                'items_sold'          => $currentMetrics['items_sold'],
                'total_revenue'       => $currentMetrics['revenue'],
                'average_rating'      => round((float) $avgRating, 1),
                'store_stats'         => $storeStats,
                'top_products'        => $topProducts,
                'new_customers'       => $newCustomers,
                'returning_customers' => $returningCustomers,
                'total_customers'     => $totalCustomers,
                'top_buyers'          => $topBuyers,
                'revenue_by_category' => $revenueByCategory,
                'comparison_label'    => $this->ownerManagerComparisonLabel($period),
                'trends'              => [
                    'total_orders'  => $this->percentageChange($currentMetrics['orders'], $previousMetrics['orders']),
                    'items_sold'    => $this->percentageChange($currentMetrics['items_sold'], $previousMetrics['items_sold']),
                    'total_revenue' => $this->percentageChange($currentMetrics['revenue'], $previousMetrics['revenue']),
                ],
            ],
        ]);
    }

    public function ownerManagerStores()
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;

        $zones = Zone::where('status', true)->orderBy('name')->get(['id', 'name', 'boundary']);

        return Inertia::render('Dashboard/OwnerManagerStores', [
            'agrivet' => $agrivet,
            'shops'   => $agrivet ? $agrivet->shops : [],
            'zones'   => $zones->map(fn ($z) => ['id' => $z->id, 'name' => $z->name, 'boundary' => $z->boundary]),
        ]);
    }

    public function ownerManagerStoreShop(Request $request)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return app(AgrivetController::class)->storeShop($request, $agrivet->id);
    }

    public function ownerManagerStoreInformation($shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        if (! $agrivet) {
            return redirect()->route('dashboard.owner-manager.stores');
        }

        return app(AgrivetController::class)->showStoreInformation($agrivet->id, $shopId);
    }

    public function ownerManagerStoreIncome(Request $request, $shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        if (! $agrivet) {
            return redirect()->route('dashboard.owner-manager.stores');
        }

        $shop = $agrivet->shops()->where('id', $shopId)->firstOrFail();

        $month = (int) $request->input('month', now()->month);
        $year = (int) $request->input('year', now()->year);

        if ($month < 1 || $month > 12) {
            $month = (int) now()->month;
        }

        if ($year < 2000 || $year > 2100) {
            $year = (int) now()->year;
        }

        $accountNumber = $shop->account_number ?? '';
        $maskedAccount = $accountNumber !== ''
            ? substr($accountNumber, 0, max(0, strlen($accountNumber) - 4)).'****'
            : '—';

        $payoutMethod = $shop->bank_name ?: 'GCash';

        $incomeRows = DB::table('order_items')
            ->where('shop_id', $shop->id)
            ->where('item_status', $this->deliveredItemStatusId())
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->select(
                DB::raw('DATE(created_at) as income_date'),
                DB::raw('MAX(created_at) as transferred_at'),
                DB::raw('COALESCE(SUM(quantity * price_at_purchase), 0) as amount'),
                DB::raw('COUNT(*) as item_count'),
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderByDesc('income_date')
            ->get();

        $incomes = $incomeRows->map(function ($row, $index) use ($payoutMethod, $maskedAccount) {
            return [
                'id' => $index + 1,
                'transferred_at' => $row->transferred_at,
                'amount' => (float) $row->amount,
                'method' => 'Transfer to '.$payoutMethod,
                'account_number' => $maskedAccount,
                'item_count' => (int) $row->item_count,
            ];
        })->values()->toArray();

        $fullAddress = collect([
            $shop->shop_address,
            $shop->shop_city,
            $shop->shop_province,
            $shop->shop_postal_code,
        ])->filter()->implode(', ');

        return Inertia::render('Dashboard/OwnerManagerStoreIncome', [
            'shop' => [
                'id' => $shop->id,
                'shop_name' => $shop->shop_name,
                'shop_address' => $fullAddress,
                'bank_name' => $shop->bank_name,
                'account_number' => $maskedAccount,
            ],
            'incomes' => $incomes,
            'filters' => [
                'month' => $month,
                'year' => $year,
            ],
        ]);
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

    public function ownerManagerUpdateShopPermitPhoto(Request $request, $shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return app(AgrivetController::class)->updateShopPermitPhoto($request, $agrivet->id, $shopId);
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

    public function ownerManagerUpdateShopListing(Request $request, $shopId, $itemId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return app(AgrivetController::class)->updateShopListing($request, $agrivet->id, $shopId, $itemId);
    }

    public function ownerManagerStoreShopBundle(Request $request, $shopId)
    {
        $agrivet = auth()->user()->managedAgrivet;
        abort_unless($agrivet, 404);

        return app(AgrivetController::class)->storeShopBundle($request, $agrivet->id, $shopId);
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

    public function ownerManagerSupport()
    {
        return Inertia::render('Dashboard/OwnerManagerSupport', [
            'tickets' => SupportTicketController::ticketsForUser((int) auth()->id()),
            'submitTicketUrl' => route('dashboard.owner-manager.support.tickets.store'),
            'ticketActionsBaseUrl' => url('/dashboard/owner-manager/support/tickets'),
        ]);
    }

    public function superAdminSupport()
    {
        return Inertia::render('Dashboard/SuperAdminSupport', [
            'tickets' => SupportTicketController::ticketsForAdmin(),
        ]);
    }

    public function adminSupport()
    {
        return Inertia::render('Dashboard/AdminSupport', [
            'tickets' => SupportTicketController::ticketsForAdmin(),
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

        $this->transitionShopOrderRows(
            $orderShops,
            $preparingStatusId,
            'Order accepted by owner/manager.',
            'owner_manager_dashboard',
        );

        $preparingItemStatusId = DB::table('order_item_status')->where('stat_description', 'Preparing')->value('id');
        if ($preparingItemStatusId) {
            DB::table('order_items')
                ->where('order_id', $orderId)
                ->whereIn('shop_id', $shopIds)
                ->update(['item_status' => (int) $preparingItemStatusId, 'updated_at' => $now]);
        }

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

        $this->transitionShopOrderRows(
            $orderShops,
            $cancelledStatusId,
            $declineReason,
            'owner_manager_dashboard',
        );

        $cancelledItemStatusId = DB::table('order_item_status')->where('stat_description', 'Cancelled')->value('id');
        if ($cancelledItemStatusId) {
            DB::table('order_items')
                ->where('order_id', $orderId)
                ->whereIn('shop_id', $shopIds)
                ->update(['item_status' => (int) $cancelledItemStatusId, 'updated_at' => $now]);
        }

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

        $this->transitionShopOrderRows(
            $orderShops,
            $readyStatus['order_status_id'],
            'Order marked as ready by owner/manager.',
            'owner_manager_dashboard',
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

        $deliveredItemStatusId = $this->deliveredItemStatusId();

        $itemsSold = (int) DB::table('order_items')
            ->where('item_status', $deliveredItemStatusId)
            ->sum('quantity');

        $avgItemsPerOrder = $ordersTotal > 0 ? round($itemsSold / $ordersTotal, 1) : 0;

        $topStores = DB::table('shops')
            ->join('agrivets', 'shops.agrivet_id', '=', 'agrivets.id')
            ->leftJoin('order_items', function ($join) use ($deliveredItemStatusId) {
                $join->on('order_items.shop_id', '=', 'shops.id')
                     ->where('order_items.item_status', '=', $deliveredItemStatusId);
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

    private function ownerManagerPeriod(Request $request): string
    {
        $period = $request->string('period')->toString();

        return in_array($period, ['day', 'week', 'month', 'year'], true) ? $period : 'month';
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function ownerManagerPeriodRange(string $period): array
    {
        $now = now();

        return match ($period) {
            'day' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            'week' => [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear()],
            default => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
        };
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function ownerManagerPreviousPeriodRange(string $period): array
    {
        $now = now();

        return match ($period) {
            'day' => [$now->copy()->subDay()->startOfDay(), $now->copy()->subDay()->endOfDay()],
            'week' => [$now->copy()->subWeek()->startOfWeek(), $now->copy()->subWeek()->endOfWeek()],
            'year' => [$now->copy()->subYear()->startOfYear(), $now->copy()->subYear()->endOfYear()],
            default => [$now->copy()->subMonthNoOverflow()->startOfMonth(), $now->copy()->subMonthNoOverflow()->endOfMonth()],
        };
    }

    private function ownerManagerComparisonLabel(string $period): string
    {
        return match ($period) {
            'day' => 'from yesterday',
            'week' => 'from last week',
            'year' => 'from last year',
            default => 'from last month',
        };
    }

    /**
     * @return array{
     *     total_orders: int,
     *     items_sold: int,
     *     total_revenue: float,
     *     average_rating: int|float,
     *     store_stats: array<int, mixed>,
     *     top_products: array<int, mixed>,
     *     new_customers: int,
     *     returning_customers: int,
     *     total_customers: int,
     *     top_buyers: array<int, mixed>,
     *     revenue_by_category: array<int, mixed>,
     *     comparison_label: string,
     *     trends: array{total_orders: null, items_sold: null, total_revenue: null}
     * }
     */
    private function emptyOwnerManagerStats(string $period): array
    {
        return [
            'total_orders'        => 0,
            'items_sold'          => 0,
            'total_revenue'       => 0,
            'average_rating'      => 0,
            'store_stats'         => [],
            'top_products'        => [],
            'new_customers'       => 0,
            'returning_customers' => 0,
            'total_customers'     => 0,
            'top_buyers'          => [],
            'revenue_by_category' => [],
            'comparison_label'    => $this->ownerManagerComparisonLabel($period),
            'trends'              => [
                'total_orders'  => null,
                'items_sold'    => null,
                'total_revenue' => null,
            ],
        ];
    }

    /**
     * @param  array<int>  $shopIds
     * @return array{orders: int, items_sold: int, revenue: float}
     */
    private function ownerManagerKeyMetrics(array $shopIds, int $deliveredItemStatusId, Carbon $start, Carbon $end): array
    {
        $orders = (int) DB::table('order_items')
            ->whereIn('shop_id', $shopIds)
            ->whereBetween('created_at', [$start, $end])
            ->distinct('order_id')
            ->count('order_id');

        $itemsSold = (int) DB::table('order_items')
            ->whereIn('shop_id', $shopIds)
            ->where('item_status', $deliveredItemStatusId)
            ->whereBetween('created_at', [$start, $end])
            ->sum('quantity');

        $revenue = (float) DB::table('order_items')
            ->whereIn('shop_id', $shopIds)
            ->where('item_status', $deliveredItemStatusId)
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('COALESCE(SUM(quantity * price_at_purchase), 0) as total')
            ->value('total');

        return [
            'orders'     => $orders,
            'items_sold' => $itemsSold,
            'revenue'    => $revenue,
        ];
    }

    /**
     * @param  array<int>  $shopIds
     * @return array{orders: \Illuminate\Support\Collection<int|string, mixed>, revenue: \Illuminate\Support\Collection<int|string, mixed>}
     */
    private function ownerManagerShopMetricMap(array $shopIds, int $deliveredItemStatusId, Carbon $start, Carbon $end): array
    {
        $orders = DB::table('order_items')
            ->whereIn('shop_id', $shopIds)
            ->whereBetween('created_at', [$start, $end])
            ->select('shop_id', DB::raw('COUNT(DISTINCT order_id) as orders'))
            ->groupBy('shop_id')
            ->pluck('orders', 'shop_id');

        $revenue = DB::table('order_items')
            ->whereIn('shop_id', $shopIds)
            ->where('item_status', $deliveredItemStatusId)
            ->whereBetween('created_at', [$start, $end])
            ->select('shop_id', DB::raw('COALESCE(SUM(quantity * price_at_purchase), 0) as revenue'))
            ->groupBy('shop_id')
            ->pluck('revenue', 'shop_id');

        return [
            'orders'  => $orders,
            'revenue' => $revenue,
        ];
    }

    private function percentageChange(float|int $current, float|int $previous): ?float
    {
        if ((float) $previous === 0.0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
