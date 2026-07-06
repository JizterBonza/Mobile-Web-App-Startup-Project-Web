<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Shop;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SearchController extends Controller
{
    /**
     * Search items and stores (shops) in a single request.
     */
    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'q' => 'required|string|min:2|max:100',
            'type' => 'nullable|in:items,shops',
            'shop_id' => 'nullable|exists:shops,id',
            'category' => 'nullable|string|max:100',
            'min_price' => 'nullable|numeric|min:0',
            'max_price' => 'nullable|numeric|min:0',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $searchTerm = $request->input('q');
        $limit = $request->input('limit', 10);
        $type = $request->input('type');

        $items = collect();
        $shops = collect();

        if ($type !== 'shops') {
            $items = $this->searchItems($request, $searchTerm, $limit);
        }

        if ($type !== 'items') {
            $shops = $this->searchShops($searchTerm, $limit);
        }

        return response()->json([
            'success' => true,
            'query' => $searchTerm,
            'data' => [
                'items' => $items,
                'shops' => $shops,
            ],
            'count' => [
                'items' => $items->count(),
                'shops' => $shops->count(),
            ],
        ]);
    }

    private function searchItems(Request $request, string $searchTerm, int $limit)
    {
        $query = Item::query()
            ->where('item_status', 'active')
            ->where(function ($q) use ($searchTerm) {
                $q->where('item_name', 'like', '%' . $searchTerm . '%')
                    ->orWhere('item_description', 'like', '%' . $searchTerm . '%');
            });

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

        return $query
            ->select(['id', 'item_name', 'item_images', 'item_price', 'discount_percent', 'discount_type', 'discount_expires_at'])
            ->orderByRaw('CASE
                WHEN item_name LIKE ? THEN 1
                WHEN item_name LIKE ? THEN 2
                ELSE 3
            END', [$searchTerm, $searchTerm . '%'])
            ->orderBy('average_rating', 'desc')
            ->orderBy('sold_count', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn (Item $item) => [
                'item_id' => $item->id,
                'item_name' => $item->item_name,
                'image' => $this->firstImage($item->item_images),
                'price' => $item->getEffectivePrice(),
            ]);
    }

    private function searchShops(string $searchTerm, int $limit)
    {
        return Shop::query()
            ->where('shop_status', 'active')
            ->where(function ($q) use ($searchTerm) {
                $q->where('shop_name', 'like', '%' . $searchTerm . '%')
                    ->orWhere('shop_description', 'like', '%' . $searchTerm . '%')
                    ->orWhere('shop_address', 'like', '%' . $searchTerm . '%');
            })
            ->select(['id', 'shop_name', 'logo_url'])
            ->orderByRaw('CASE
                WHEN shop_name LIKE ? THEN 1
                WHEN shop_name LIKE ? THEN 2
                ELSE 3
            END', [$searchTerm, $searchTerm . '%'])
            ->orderBy('average_rating', 'desc')
            ->orderBy('total_reviews', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn (Shop $shop) => [
                'shop_id' => $shop->id,
                'name' => $shop->shop_name,
                'image' => $shop->logo_url,
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
