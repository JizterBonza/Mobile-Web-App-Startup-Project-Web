<?php

namespace App\Http\Controllers;

use App\Models\Shop;
use App\Models\RatingReview;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ShopController extends Controller
{
    /**
     * Fetch all shops
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Shop::query();

        // Filter by user_id if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('shop_status', $request->status);
        } else {
            // Default to active shops only
            $query->where('shop_status', 'active');
        }

        // Search by shop name if provided
        if ($request->has('search')) {
            $query->where('shop_name', 'like', '%' . $request->search . '%');
        }

        // Order by created_at descending (newest first)
        $query->orderBy('created_at', 'desc');

        $shops = $query->get();

        return response()->json([
            'success' => true,
            'data' => $shops,
            'count' => $shops->count()
        ]);
    }

    /**
     * Fetch a single shop by ID
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $shop = Shop::find($id);

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $shop
        ]);
    }

    /**
     * Fetch a shop with its items
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getShopWithItems($id)
    {
        $shop = Shop::with(['items' => function ($query) {
            $query->where('item_status', 'active')
                  ->orderBy('created_at', 'desc');
        }])->find($id);

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $shop
        ]);
    }

    /**
     * Fetch a shop by user ID
     *
     * @param int $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByUserId($userId)
    {
        $shop = Shop::where('user_id', $userId)->first();

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found for this user'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $shop
        ]);
    }

    /**
     * Create a new shop
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'shop_name' => 'required|string|max:150',
            'shop_description' => 'nullable|string',
            'shop_address' => 'nullable|string|max:255',
            'shop_lat' => 'nullable|numeric',
            'shop_long' => 'nullable|numeric',
            'contact_number' => 'nullable|string|max:20',
            'logo_url' => 'nullable|string|max:255',
            'shop_status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $shop = Shop::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Shop created successfully',
            'data' => $shop
        ], 201);
    }

    /**
     * Update an existing shop
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $shop = Shop::find($id);

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|exists:users,id',
            'shop_name' => 'sometimes|string|max:150',
            'shop_description' => 'nullable|string',
            'shop_address' => 'nullable|string|max:255',
            'shop_lat' => 'nullable|numeric',
            'shop_long' => 'nullable|numeric',
            'contact_number' => 'nullable|string|max:20',
            'logo_url' => 'nullable|string|max:255',
            'shop_status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $shop->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Shop updated successfully',
            'data' => $shop
        ]);
    }

    /**
     * Delete a shop
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $shop = Shop::find($id);

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        $shop->delete();

        return response()->json([
            'success' => true,
            'message' => 'Shop deleted successfully'
        ]);
    }

    /**
     * Fetch a shop with its reviews
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function getShopWithReviews($id)
    {
        $shop = Shop::with(['ratingReviews' => function ($query) {
            $query->orderBy('created_at', 'desc')
                  ->with(['user.userCredential' => function ($query) {
                      $query->select('id', 'username');
                  }]);
        }])->find($id);

        if (!$shop) {
            return response()->json([
                'success' => false,
                'message' => 'Shop not found'
            ], 404);
        }

        // Get shop data without the rating_reviews relationship
        $shopData = $shop->only([
            'id', 'user_id', 'shop_name', 'shop_description', 'shop_address',
            'shop_lat', 'shop_long', 'contact_number', 'logo_url',
            'average_rating', 'total_reviews', 'shop_status', 'created_at', 'updated_at'
        ]);

        // Add reviews
        $shopData['reviews'] = $shop->ratingReviews->map(function ($review) {
            return [
                'id' => $review->id,
                'user_id' => $review->user_id,
                'username' => $review->user->userCredential->username ?? null,
                'item_id' => $review->item_id,
                'rating' => $review->rating,
                'comment' => $review->review_text,
                'review_images' => $review->review_images,
                'order_id' => $review->order_id,
                'created_at' => $review->created_at,
                'updated_at' => $review->updated_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $shopData
        ]);
    }

    /**
     * Search shops with optimized query
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function search(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'q' => 'required|string|min:2|max:100',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $query = Shop::query();

        // Only search active shops by default
        $query->where('shop_status', 'active');

        // Search by shop name and description
        $searchTerm = $request->input('q');
        $query->where(function($q) use ($searchTerm) {
            $q->where('shop_name', 'like', '%' . $searchTerm . '%')
              ->orWhere('shop_description', 'like', '%' . $searchTerm . '%')
              ->orWhere('shop_address', 'like', '%' . $searchTerm . '%');
        });

        // Order by relevance (exact match first, then by rating)
        $query->orderByRaw("CASE 
            WHEN shop_name LIKE ? THEN 1 
            WHEN shop_name LIKE ? THEN 2 
            ELSE 3 
        END", [$searchTerm, $searchTerm . '%'])
        ->orderBy('average_rating', 'desc')
        ->orderBy('total_reviews', 'desc');

        // Limit results (default 20, max 50)
        $limit = $request->input('limit', 20);
        $shops = $query->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $shops,
            'count' => $shops->count(),
            'query' => $searchTerm
        ]);
    }
}

