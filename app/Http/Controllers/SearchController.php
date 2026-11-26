<?php

namespace App\Http\Controllers;

use App\Models\Farm;
use App\Models\Item;
use App\Models\Shop;
use App\Services\FarmListingDiscoveryService;
use App\Services\ShopZoneCoverageService;
use App\Support\FuzzySearch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SearchController extends Controller
{
    /**
     * Search items, stores (shops), partner farms, and gamefowl listings in a single request.
     */
    public function index(Request $request, FarmListingDiscoveryService $discovery, ShopZoneCoverageService $coverage)
    {
        $validator = Validator::make($request->all(), [
            'q' => 'required|string|min:2|max:100',
            'type' => 'nullable|in:items,shops,farms,gamefowl',
            'shop_id' => 'nullable|exists:shops,id',
            'category' => 'nullable|string|max:100',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'limit' => 'nullable|integer|min:1|max:50',
            'lat' => 'nullable|numeric|between:-90,90',
            'long' => 'nullable|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $searchTerm = $request->input('q');
        $limit = (int) ($request->input('limit') ?? 10);
        $type = $request->input('type');

        $items = collect();
        $shops = collect();
        $farms = collect();
        $gamefowl = collect();

        if ($type === null || $type === 'items') {
            $items = $this->searchItems($request, $searchTerm, $limit);
        }

        if ($type === null || $type === 'shops') {
            $zoneIds = $request->filled('lat') && $request->filled('long')
                ? $coverage->zoneIdsContainingPoint((float) $request->input('lat'), (float) $request->input('long'))
                : [];
            $shops = $this->searchShops($searchTerm, $limit, $zoneIds);
        }

        if ($type === null || $type === 'farms') {
            $farms = $this->searchFarms($searchTerm, $limit);
        }

        // Hide gamefowl listings from combined search. Items, shops, and partner farms stay visible.
        // if ($type === null || $type === 'gamefowl') {
        //     $gamefowl = $discovery->search($searchTerm, $limit);
        // }

        return response()->json([
            'success' => true,
            'query' => $searchTerm,
            'data' => [
                'items' => $items,
                'shops' => $shops,
                'farms' => $farms,
                'gamefowl' => $gamefowl,
            ],
            'count' => [
                'items' => $items->count(),
                'shops' => $shops->count(),
                'farms' => $farms->count(),
                'gamefowl' => $gamefowl->count(),
            ],
        ]);
    }

    private function searchItems(Request $request, string $searchTerm, int $limit)
    {
        $query = Item::query()
            ->whereShopAgrivetIsActive()
            ->where('item_status', 'active');
        FuzzySearch::constrain($query, $searchTerm, ['item_name', 'item_description']);

        if ($request->filled('shop_id')) {
            $query->where('shop_id', $request->shop_id);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('min_price')) {
            $query->where('item_price', '>=', $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('item_price', '<=', $request->max_price);
        }

        FuzzySearch::orderByNameRelevance($query, $searchTerm, 'item_name');

        return FuzzySearch::rank(
            $query
                ->select(['id', 'product_catalog_id', 'item_name', 'item_description', 'item_images', 'item_price', 'category', 'discount_percent', 'discount_type', 'discount_expires_at', 'is_bundle', 'average_rating', 'sold_count'])
                ->orderBy('average_rating', 'desc')
                ->orderBy('sold_count', 'desc')
                ->limit(FuzzySearch::CANDIDATE_LIMIT)
                ->get(),
            $searchTerm,
            'item_name',
            ['item_description']
        )
            ->take($limit)
            ->map(fn (Item $item) => [
                'item_id' => $item->id,
                'item_name' => $item->item_name,
                'image' => $this->firstImage($item->item_images),
                'price' => $item->getEffectivePrice(),
            ]);
    }

    /**
     * @param  array<int, int>  $zoneIds
     */
    private function searchShops(string $searchTerm, int $limit, array $zoneIds)
    {
        if ($zoneIds === []) {
            return collect();
        }

        $query = Shop::query()
            ->whereAgrivetIsActive()
            ->where('shop_status', 'active')
            ->whereIn('zone_id', $zoneIds);
        FuzzySearch::constrain($query, $searchTerm, ['shop_name', 'shop_description', 'shop_address']);
        FuzzySearch::orderByNameRelevance($query, $searchTerm, 'shop_name');

        return FuzzySearch::rank(
            $query
                ->select(['id', 'shop_name', 'shop_description', 'shop_address', 'logo_url', 'average_rating', 'total_reviews'])
                ->orderBy('average_rating', 'desc')
                ->orderBy('total_reviews', 'desc')
                ->limit(FuzzySearch::CANDIDATE_LIMIT)
                ->get(),
            $searchTerm,
            'shop_name',
            ['shop_description', 'shop_address']
        )
            ->take($limit)
            ->map(fn (Shop $shop) => [
                'shop_id' => $shop->id,
                'name' => $shop->shop_name,
                'image' => $shop->logo_url,
            ]);
    }

    private function searchFarms(string $searchTerm, int $limit)
    {
        $query = Farm::query()->where('status', 'active');
        FuzzySearch::constrain($query, $searchTerm, ['name', 'description', 'address']);
        FuzzySearch::orderByNameRelevance($query, $searchTerm, 'name');

        return FuzzySearch::rank(
            $query
                ->select(['id', 'name', 'description', 'address', 'logo_url'])
                ->latest()
                ->orderByDesc('id')
                ->limit(FuzzySearch::CANDIDATE_LIMIT)
                ->get(),
            $searchTerm,
            'name',
            ['description', 'address']
        )
            ->take($limit)
            ->map(fn (Farm $farm) => [
                'farm_id' => $farm->id,
                'name' => $farm->name,
                'image' => $farm->logo_url,
            ]);
    }

    private function firstImage(?array $images): ?string
    {
        if (empty($images)) {
            return null;
        }

        return $images[0] ?? null;
    }
}
