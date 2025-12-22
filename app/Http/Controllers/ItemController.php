<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\RatingReview;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ItemController extends Controller
{
    /**
     * Fetch all items
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Item::query();

        // Filter by shop_id if provided
        if ($request->has('shop_id')) {
            $query->where('shop_id', $request->shop_id);
        }

        // Filter by category if provided
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('item_status', $request->status);
        } else {
            // Default to active items only
            $query->where('item_status', 'active');
        }

        // Search by item name if provided
        if ($request->has('search')) {
            $query->where('item_name', 'like', '%' . $request->search . '%');
        }

        // Order by created_at descending (newest first)
        $query->orderBy('created_at', 'desc');

        $items = $query->get();

        return response()->json([
            'success' => true,
            'data' => $items,
            'count' => $items->count()
        ]);
    }

    /**
     * Fetch a single item by ID
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $item = Item::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $item
        ]);
    }

    public function getItemWithReviews($id)
    {
        $item = Item::with(['ratingReviews' => function ($query) {
            $query->orderBy('created_at', 'desc')
                  ->with(['user.userCredential' => function ($query) {
                      $query->select('id', 'username');
                  }]);
        }])->find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found'
            ], 404);
        }
        
        //$itemData = $item->toArray();
        // Get item data without the rating_reviews relationship
        $itemData = $item->only([
            'id', 'shop_id', 'item_name', 'item_description', 'item_price',
            'item_quantity', 'category', 'item_images', 'item_status',
            'average_rating', 'total_reviews', 'sold_count', 'created_at', 'updated_at'
        ]);
        
        // Add reviews
        $itemData['reviews'] = $item->ratingReviews->map(function ($review) {
            return [
                'id' => $review->id,
                'user_id' => $review->user_id,
                'username' => $review->user->userCredential->username ?? null,
                'rating' => $review->rating,
                'comment' => $review->review_text,
                'review_images' => $review->review_images,
                'order_id' => $review->order_id,
                'created_at' => $review->created_at,
                'updated_at' => $review->updated_at,
                'verified' => 'false',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $itemData
        ]);
    }

    /**
     * Fetch 10 random items
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function random(Request $request)
    {
        $query = Item::query();

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('item_status', $request->status);
        } else {
            // Default to active items only
            $query->where('item_status', 'active');
        }

        // Filter by category if provided
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        // Get 10 random items
        $items = $query->inRandomOrder()->limit(10)->get();

        return response()->json([
            'success' => true,
            'data' => $items,
            'count' => $items->count()
        ]);
    }

    /**
     * Create a new item
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'shop_id' => 'required|exists:shops,id',
            'item_name' => 'required|string|max:150',
            'item_description' => 'nullable|string',
            'item_price' => 'required|numeric|min:0',
            'item_quantity' => 'nullable|integer|min:0',
            'category' => 'nullable|string|max:100',
            'item_images' => 'nullable|array',
            'item_status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $item = Item::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Item created successfully',
            'data' => $item
        ], 201);
    }

    /**
     * Update an existing item
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $item = Item::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'shop_id' => 'sometimes|exists:shops,id',
            'item_name' => 'sometimes|string|max:150',
            'item_description' => 'nullable|string',
            'item_price' => 'sometimes|numeric|min:0',
            'item_quantity' => 'nullable|integer|min:0',
            'category' => 'nullable|string|max:100',
            'item_images' => 'nullable|array',
            'item_status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $item->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Item updated successfully',
            'data' => $item
        ]);
    }

    /**
     * Delete an item
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $item = Item::find($id);

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found'
            ], 404);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item deleted successfully'
        ]);
    }

    /**
     * Search items with optimized query
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function search(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'q' => 'required|string|min:2|max:100',
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
                'errors' => $validator->errors()
            ], 422);
        }

        $query = Item::query();

        // Only search active items by default
        $query->where('item_status', 'active');

        // Search by item name and description
        $searchTerm = $request->input('q');
        $query->where(function($q) use ($searchTerm) {
            $q->where('item_name', 'like', '%' . $searchTerm . '%')
            ->orWhere('item_description', 'like', '%' . $searchTerm . '%');
        });

        // Filter by shop_id if provided
        if ($request->filled('shop_id')) {
            $query->where('shop_id', $request->shop_id);
        }

        // Filter by category if provided
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Filter by price range
        if ($request->filled('min_price')) {
            $query->where('item_price', '>=', $request->min_price);
        }

        if ($request->filled('max_price')) {
            $query->where('item_price', '<=', $request->max_price);
        }

        // Order by relevance (exact match first, then by rating, then by sold count)
        $query->orderByRaw("CASE 
            WHEN item_name LIKE ? THEN 1 
            WHEN item_name LIKE ? THEN 2 
            ELSE 3 
        END", [$searchTerm, $searchTerm . '%'])
        ->orderBy('average_rating', 'desc')
        ->orderBy('sold_count', 'desc');

        // Limit results (default 20, max 50)
        $limit = $request->input('limit', 20);
        $items = $query->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $items,
            'count' => $items->count(),
            'query' => $searchTerm
        ]);
    }
}

