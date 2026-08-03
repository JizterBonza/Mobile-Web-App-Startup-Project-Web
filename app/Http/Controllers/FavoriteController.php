<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Models\Favorite;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FavoriteController extends Controller
{
    use EnsuresApiOwnership;

    public function index(Request $request)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $query = Favorite::with(['item', 'user'])
            ->where('user_id', $this->authUserId($request));

        if ($request->has('item_id')) {
            $query->where('item_id', $request->item_id);
        }

        $query->orderBy('created_at', 'desc');

        $favorites = $query->get();

        return response()->json([
            'success' => true,
            'data' => $favorites,
            'count' => $favorites->count()
        ]);
    }

    public function show(Request $request, $id)
    {
        $favorite = Favorite::with(['item', 'user'])->find($id);

        if (!$favorite) {
            return response()->json([
                'success' => false,
                'message' => 'Favorite not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $favorite->user_id)) {
            return $response;
        }

        return response()->json([
            'success' => true,
            'data' => $favorite
        ]);
    }

    public function getByUser(Request $request, $userId)
    {
        if ($response = $this->ensureSelfOrStaff($request, $userId)) {
            return $response;
        }

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

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|integer',
            'item_id' => 'required|exists:items,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $userId = $this->authUserId($request);

        $item = Item::find($request->item_id);
        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found'
            ], 404);
        }

        $existingFavorite = Favorite::where('user_id', $userId)
            ->where('item_id', $request->item_id)
            ->first();

        if ($existingFavorite) {
            return response()->json([
                'success' => false,
                'message' => 'Item is already in favorites',
                'data' => $existingFavorite->load(['item', 'user'])
            ], 409);
        }

        $favorite = Favorite::create([
            'user_id' => $userId,
            'item_id' => $request->item_id,
            'created_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Item added to favorites successfully',
            'data' => $favorite->load(['item', 'user'])
        ], 201);
    }

    public function destroy(Request $request, $id)
    {
        $favorite = Favorite::find($id);

        if (!$favorite) {
            return response()->json([
                'success' => false,
                'message' => 'Favorite not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $favorite->user_id)) {
            return $response;
        }

        $favorite->delete();

        return response()->json([
            'success' => true,
            'message' => 'Item removed from favorites successfully'
        ]);
    }

    public function removeByUserAndItem(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|integer',
            'item_id' => 'required|exists:items,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $favorite = Favorite::where('user_id', $this->authUserId($request))
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

    public function toggle(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|integer',
            'item_id' => 'required|exists:items,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $userId = $this->authUserId($request);

        $item = Item::find($request->item_id);
        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found'
            ], 404);
        }

        $favorite = Favorite::where('user_id', $userId)
            ->where('item_id', $request->item_id)
            ->first();

        if ($favorite) {
            $favorite->delete();
            return response()->json([
                'success' => true,
                'message' => 'Item removed from favorites',
                'is_favorited' => false
            ]);
        }

        $favorite = Favorite::create([
            'user_id' => $userId,
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

    public function check(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|integer',
            'item_id' => 'required|exists:items,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $isFavorited = Favorite::where('user_id', $this->authUserId($request))
            ->where('item_id', $request->item_id)
            ->exists();

        return response()->json([
            'success' => true,
            'is_favorited' => $isFavorited
        ]);
    }
}
