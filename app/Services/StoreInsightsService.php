<?php

namespace App\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class StoreInsightsService
{
    /**
     * Weekly, monthly, and yearly figures for one shop.
     *
     * Counts paid or delivered lines and skips cancelled lines. A customer is new
     * when their first counted order at this shop falls in the period, and returning
     * when they ordered before that period and again during it.
     *
     * @return array<string, array<string, mixed>>
     */
    public function forShop(int $shopId): array
    {
        $rows = $this->salesRows($shopId);
        $firstPurchase = $this->firstPurchaseAt($rows);

        return [
            'weekly' => $this->buildPeriod($rows, $firstPurchase, 'weekly'),
            'monthly' => $this->buildPeriod($rows, $firstPurchase, 'monthly'),
            'yearly' => $this->buildPeriod($rows, $firstPurchase, 'yearly'),
        ];
    }

    /**
     * @return Collection<int, array{order_id: int, user_id: int, ordered_at: Carbon, quantity: int, revenue: float}>
     */
    private function salesRows(int $shopId): Collection
    {
        if (! Schema::hasTable('order_items') || ! Schema::hasTable('orders')) {
            return collect();
        }

        $cancelledItemStatusId = $this->statusId('order_item_status', 'Cancelled');
        $deliveredItemStatusId = $this->statusId('order_item_status', 'Delivered');
        $deliveredOrderStatusId = $this->statusId('order_status', 'Delivered');

        $query = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('order_items.shop_id', $shopId);

        if (Schema::hasTable('order_details')) {
            $query->leftJoin('order_details', 'orders.order_detail_id', '=', 'order_details.id');
        }

        $query->select(
            'orders.id as order_id',
            'orders.user_id',
            DB::raw('COALESCE(orders.ordered_at, order_items.created_at) as ordered_at'),
            'order_items.quantity',
            'order_items.price_at_purchase',
        );

        if ($cancelledItemStatusId > 0) {
            $query->where(function ($status) use ($cancelledItemStatusId) {
                $status->whereNull('order_items.item_status')
                    ->orWhere('order_items.item_status', '!=', $cancelledItemStatusId);
            });
        }

        $query->where(function ($sale) use ($deliveredItemStatusId, $deliveredOrderStatusId) {
            if (Schema::hasTable('order_details')) {
                $sale->where('order_details.payment_status', 'paid');
            }

            if ($deliveredItemStatusId > 0) {
                $sale->orWhere('order_items.item_status', $deliveredItemStatusId);
            }

            if ($deliveredOrderStatusId > 0 && Schema::hasTable('order_shops')) {
                $sale->orWhereExists(function ($sub) use ($deliveredOrderStatusId) {
                    $sub->selectRaw('1')
                        ->from('order_shops')
                        ->whereColumn('order_shops.order_id', 'order_items.order_id')
                        ->whereColumn('order_shops.shop_id', 'order_items.shop_id')
                        ->where('order_shops.order_status', $deliveredOrderStatusId);
                });
            }
        });

        return $query->get()
            ->filter(fn ($row) => $row->user_id !== null && $row->ordered_at !== null)
            ->map(function ($row) {
                return [
                    'order_id' => (int) $row->order_id,
                    'user_id' => (int) $row->user_id,
                    'ordered_at' => Carbon::parse($row->ordered_at),
                    'quantity' => (int) $row->quantity,
                    'revenue' => round((float) $row->quantity * (float) $row->price_at_purchase, 2),
                ];
            })
            ->values();
    }

    /**
     * @param  Collection<int, array{order_id: int, user_id: int, ordered_at: Carbon, quantity: int, revenue: float}>  $rows
     * @return array<int, Carbon>
     */
    private function firstPurchaseAt(Collection $rows): array
    {
        $first = [];

        foreach ($rows as $row) {
            $userId = $row['user_id'];
            if (! isset($first[$userId]) || $row['ordered_at']->lt($first[$userId])) {
                $first[$userId] = $row['ordered_at'];
            }
        }

        return $first;
    }

    /**
     * @param  Collection<int, array{order_id: int, user_id: int, ordered_at: Carbon, quantity: int, revenue: float}>  $rows
     * @param  array<int, Carbon>  $firstPurchase
     * @return array<string, mixed>
     */
    private function buildPeriod(Collection $rows, array $firstPurchase, string $period): array
    {
        [$currentStart, $currentEnd] = $this->range($period, 0);
        [$previousStart, $previousEnd] = $this->range($period, 1);
        [$priorStart, $priorEnd] = $this->range($period, 2);

        $current = $this->summarize($rows, $firstPurchase, $currentStart, $currentEnd);
        $previous = $this->summarize($rows, $firstPurchase, $previousStart, $previousEnd);
        $prior = $this->summarize($rows, $firstPurchase, $priorStart, $priorEnd);

        $retention = $this->retentionRate($previous['user_ids'], $current['user_ids']);
        $previousRetention = $this->retentionRate($prior['user_ids'], $previous['user_ids']);

        $buckets = $this->buckets($period, $currentStart, $currentEnd);
        $hasActivity = $current['orders'] > 0 || $current['total'] > 0;

        return [
            'newCustomers' => $current['new'],
            'returningCustomers' => $current['returning'],
            'totalCustomers' => $current['total'],
            'retentionRate' => $retention,
            'orderCount' => $current['orders'],
            'productsSold' => $current['products'],
            'revenue' => $current['revenue'],
            'trends' => [
                'newCustomers' => $this->percentageChange($current['new'], $previous['new']),
                'returningCustomers' => $this->percentageChange($current['returning'], $previous['returning']),
                'totalCustomers' => $this->percentageChange($current['total'], $previous['total']),
                'retentionRate' => ($retention === null || $previousRetention === null)
                    ? null
                    : $this->percentageChange($retention, $previousRetention),
                'orderCount' => $this->percentageChange($current['orders'], $previous['orders']),
                'productsSold' => $this->percentageChange($current['products'], $previous['products']),
                'revenue' => $this->percentageChange($current['revenue'], $previous['revenue']),
            ],
            'customerChart' => $hasActivity
                ? array_map(function (array $bucket) use ($rows, $firstPurchase) {
                    $summary = $this->summarize($rows, $firstPurchase, $bucket['start'], $bucket['end']);

                    return [
                        'name' => $bucket['name'],
                        'new' => $summary['new'],
                        'returning' => $summary['returning'],
                    ];
                }, $buckets)
                : [],
            'revenueChart' => $hasActivity
                ? array_map(function (array $bucket) use ($rows, $firstPurchase) {
                    $summary = $this->summarize($rows, $firstPurchase, $bucket['start'], $bucket['end']);

                    return [
                        'name' => $bucket['name'],
                        'revenue' => $summary['revenue'],
                        'orders' => $summary['orders'],
                    ];
                }, $buckets)
                : [],
        ];
    }

    /**
     * @param  Collection<int, array{order_id: int, user_id: int, ordered_at: Carbon, quantity: int, revenue: float}>  $rows
     * @param  array<int, Carbon>  $firstPurchase
     * @return array{new: int, returning: int, total: int, orders: int, products: int, revenue: float, user_ids: array<int, int>}
     */
    private function summarize(Collection $rows, array $firstPurchase, Carbon $start, Carbon $end): array
    {
        $inRange = $rows->filter(
            fn (array $row) => $row['ordered_at']->between($start, $end)
        );

        $userIds = $inRange->pluck('user_id')->unique()->values();
        $new = 0;
        $returning = 0;

        foreach ($userIds as $userId) {
            $first = $firstPurchase[$userId] ?? null;
            if ($first && $first->between($start, $end)) {
                $new++;
            } else {
                $returning++;
            }
        }

        return [
            'new' => $new,
            'returning' => $returning,
            'total' => $userIds->count(),
            'orders' => $inRange->pluck('order_id')->unique()->count(),
            'products' => (int) $inRange->sum('quantity'),
            'revenue' => round((float) $inRange->sum('revenue'), 2),
            'user_ids' => $userIds->map(fn ($id) => (int) $id)->all(),
        ];
    }

    /**
     * Share of the earlier period's customers who ordered again in the later period.
     *
     * @param  array<int, int>  $earlierUserIds
     * @param  array<int, int>  $laterUserIds
     */
    private function retentionRate(array $earlierUserIds, array $laterUserIds): ?float
    {
        $earlier = count($earlierUserIds);
        if ($earlier === 0) {
            return null;
        }

        $retained = count(array_intersect($earlierUserIds, $laterUserIds));

        return round(($retained / $earlier) * 100, 1);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function range(string $period, int $periodsAgo): array
    {
        if ($period === 'weekly') {
            $start = now()->copy()->startOfWeek(Carbon::MONDAY)->subWeeks($periodsAgo)->startOfDay();

            return [$start, $start->copy()->addDays(6)->endOfDay()];
        }

        if ($period === 'yearly') {
            $anchor = now()->copy()->subYears($periodsAgo);

            return [
                $anchor->copy()->startOfYear()->startOfDay(),
                $anchor->copy()->endOfYear()->endOfDay(),
            ];
        }

        $anchor = now()->copy()->subMonthsNoOverflow($periodsAgo);

        return [
            $anchor->copy()->startOfMonth()->startOfDay(),
            $anchor->copy()->endOfMonth()->endOfDay(),
        ];
    }

    /**
     * @return array<int, array{name: string, start: Carbon, end: Carbon}>
     */
    private function buckets(string $period, Carbon $start, Carbon $end): array
    {
        if ($period === 'weekly') {
            $buckets = [];
            $cursor = $start->copy()->startOfDay();
            $last = $end->copy()->startOfDay();

            while ($cursor->lte($last)) {
                $buckets[] = [
                    'name' => $cursor->format('D'),
                    'start' => $cursor->copy()->startOfDay(),
                    'end' => $cursor->copy()->endOfDay(),
                ];
                $cursor->addDay();
            }

            return $buckets;
        }

        if ($period === 'yearly') {
            $buckets = [];
            $cursor = $start->copy()->startOfMonth();
            $last = $end->copy()->startOfMonth();

            while ($cursor->lte($last)) {
                $buckets[] = [
                    'name' => $cursor->format('M'),
                    'start' => $cursor->copy()->startOfMonth()->startOfDay(),
                    'end' => $cursor->copy()->endOfMonth()->endOfDay(),
                ];
                $cursor->addMonthNoOverflow();
            }

            return $buckets;
        }

        $buckets = [];
        $cursor = $start->copy()->startOfDay();
        $week = 1;

        while ($cursor->lte($end) && $week <= 6) {
            $bucketEnd = $cursor->copy()->addDays(6)->endOfDay();
            if ($bucketEnd->gt($end)) {
                $bucketEnd = $end->copy();
            }

            $buckets[] = [
                'name' => 'Week '.$week,
                'start' => $cursor->copy()->startOfDay(),
                'end' => $bucketEnd,
            ];

            $cursor = $bucketEnd->copy()->addSecond()->startOfDay();
            $week++;
        }

        return $buckets;
    }

    private function statusId(string $table, string $description): int
    {
        if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'stat_description')) {
            return 0;
        }

        return (int) (DB::table($table)->where('stat_description', $description)->value('id') ?? 0);
    }

    private function percentageChange(float|int $current, float|int $previous): ?float
    {
        if ((float) $previous === 0.0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}
