<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
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

    public function ownerManagerOrders()
    {
        $user = auth()->user();
        $agrivet = $user->managedAgrivet;
        $orders = [];

        if ($agrivet) {
            $shopIds = $agrivet->shops()->pluck('shops.id')->all();
            if (! empty($shopIds)) {
                $orders = $this->buildOwnerManagerOrders($shopIds);
            }
        }

        return Inertia::render('Dashboard/OwnerManagerOrders', [
            'agrivet' => $agrivet,
            'orders'  => $orders,
        ]);
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
    private function buildOwnerManagerOrders(array $shopIds): array
    {
        $orderIds = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->whereIn('items.shop_id', $shopIds)
            ->distinct()
            ->pluck('order_items.order_id');

        if ($orderIds->isEmpty()) {
            return [];
        }

        $orderShopAgg = DB::table('order_shops')
            ->whereIn('shop_id', $shopIds)
            ->whereIn('order_id', $orderIds)
            ->select('order_id', DB::raw('MAX(order_status) as order_status'))
            ->groupBy('order_id');

        $orderRows = DB::table('orders')
            ->whereIn('orders.id', $orderIds)
            ->joinSub($orderShopAgg, 'os_agg', 'orders.id', '=', 'os_agg.order_id')
            ->join('order_status', 'os_agg.order_status', '=', 'order_status.id')
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->join('user_details', 'users.user_detail_id', '=', 'user_details.id')
            ->leftJoin('order_details', 'orders.order_detail_id', '=', 'order_details.id')
            ->leftJoin('addresses', 'order_details.address_id', '=', 'addresses.id')
            ->select(
                'orders.id',
                'orders.ordered_at',
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

        $itemsByOrder = DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->whereIn('items.shop_id', $shopIds)
            ->whereIn('order_items.order_id', $orderIds)
            ->select(
                'order_items.order_id',
                'order_items.id',
                'items.item_name',
                'order_items.quantity',
                'order_items.price_at_purchase',
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

        return $orderRows->map(function ($row) use ($itemsByOrder, $ridersByOrder, $proofByOrder) {
            $statusMeta = $this->mapOwnerManagerOrderStatus($row->status_description ?? '');
            $products = ($itemsByOrder->get($row->id) ?? collect())->map(function ($item) {
                $thumbnail = $this->firstItemImageUrl($item->item_images);

                return [
                    'id'        => (int) $item->id,
                    'name'      => $item->item_name,
                    'quantity'  => (int) $item->quantity,
                    'price'     => (float) $item->price_at_purchase,
                    'thumbnail' => $thumbnail,
                ];
            })->values()->all();

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

            $payload = [
                'orderNumber'             => 'ORD-' . $row->id,
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
            ];

            if ($riderDetails) {
                $payload['riderDetails'] = $riderDetails;
            }

            if ($statusMeta['status'] === 'completed') {
                $payload['isSuccessful'] = $statusMeta['isSuccessful'];
                $payload['completionDate'] = $row->ordered_at;
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
        if (str_contains($d, 'deliver')) {
            return ['status' => 'completed', 'isSuccessful' => true];
        }
        if (str_contains($d, 'transit')) {
            return ['status' => 'in-transit', 'isSuccessful' => null];
        }
        if (str_contains($d, 'pickup') || str_contains($d, 'delivery') || str_contains($d, 'drop off')) {
            return ['status' => 'for-pickup', 'isSuccessful' => null];
        }
        if (str_contains($d, 'prepar')) {
            return ['status' => 'preparing', 'isSuccessful' => null];
        }

        return ['status' => 'new', 'isSuccessful' => null];
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
