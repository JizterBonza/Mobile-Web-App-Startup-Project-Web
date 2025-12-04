<?php

namespace App\Http\Controllers;

use App\Models\Favorite;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FavoriteController extends Controller
{
    /**
     * Fetch all favorites
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Favorite::with(['item', 'user']);

        // Filter by user_id if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by item_id if provided
        if ($request->has('item_id')) {
            $query->where('item_id', $request->item_id);
        }

        // Order by created_at descending (newest first)
        $query->orderBy('created_at', 'desc');

        $favorites = $query->get();

        return response()->json([
            'success' => true,
            'data' => $favorites,
            'count' => $favorites->count()
        ]);
    }

    /**
     * Fetch a single favorite by ID
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $favorite = Favorite::with(['item', 'user'])->find($id);

        if (!$favorite) {
            return response()->json([
                'success' => false,
                'message' => 'Favorite not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $favorite
        ]);
    }

    /**
     * Get favorites for a specific user
     *
     * @param int $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByUser($userId)
    {
        $favorites = Favorite::with(['item'])
            ->where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $favorites,
            'count' => $favorites->count()
        ]);
    }

    /**
     * Add item to favorites
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'item_id' => 'required|exists:items,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if item exists
        $item = Item::find($request->item_id);
        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found'
            ], 404);
        }

        // Check if item is already favorited by this user
        $existingFavorite = Favorite::where('user_id', $request->user_id)
            ->where('item_id', $request->item_id)
            ->first();

        if ($existingFavorite) {
            return response()->json([
                'success' => false,
                'message' => 'Item is already in favorites',
                'data' => $existingFavorite->load(['item', 'user'])
            ], 409);
        }

        // Create new favorite
        $favorite = Favorite::create([
            'user_id' => $request->user_id,
            'item_id' => $request->item_id,
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Item added to favorites successfully',
            'data' => $favorite->load(['item', 'user'])
        ], 201);
    }

    /**
     * Remove item from favorites
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $favorite = Favorite::find($id);

        if (!$favorite) {
            return response()->json([
                'success' => false,
                'message' => 'Favorite not found'
            ], 404);
        }

        $favorite->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item removed from favorites successfully'
        ]);
    }

    /**
     * Remove favorite by user_id and item_id
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function removeByUserAndItem(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'item_id' => 'required|exists:items,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $favorite = Favorite::where('user_id', $request->user_id)
            ->where('item_id', $request->item_id)
            ->first();

        if (!$favorite) {
            return response()->json([
                'success' => false,
                'message' => 'Favorite not found'
            ], 404);
        }

        $favorite->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item removed from favorites successfully'
        ]);
    }

    /**
     * Toggle favorite status (add if not exists, remove if exists)
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function toggle(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'item_id' => 'required|exists:items,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check if item exists
        $item = Item::find($request->item_id);
        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found'
            ], 404);
        }

        $favorite = Favorite::where('user_id', $request->user_id)
            ->where('item_id', $request->item_id)
            ->first();

        if ($favorite) {
            // Remove if exists
            $favorite->delete();
            return response()->json([
                'success' => true,
                'message' => 'Item removed from favorites',
                'is_favorited' => false
            ]);
        } else {
            // Add if not exists
            $favorite = Favorite::create([
                'user_id' => $request->user_id,
                'item_id' => $request->item_id,
                'created_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Item added to favorites',
                'is_favorited' => true,
                'data' => $favorite->load(['item', 'user'])
            ], 201);
        }
    }

    /**
     * Check if an item is favorited by a user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function check(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'item_id' => 'required|exists:items,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $isFavorited = Favorite::where('user_id', $request->user_id)
            ->where('item_id', $request->item_id)
            ->exists();

        return response()->json([
            'success' => true,
            'is_favorited' => $isFavorited
        ]);
    }
}

