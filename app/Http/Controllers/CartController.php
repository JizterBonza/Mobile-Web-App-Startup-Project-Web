<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    /**
     * Fetch all cart items
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Cart::with(['item', 'user']);

        // Filter by user_id if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            // Default to active items only
            $query->where('status', 'active');
        }

        // Order by added_at descending (newest first)
        $query->orderBy('added_at', 'desc');

        $carts = $query->get();

        return response()->json([
            'success' => true,
            'data' => $carts,
            'count' => $carts->count()
        ]);
    }

    /**
     * Fetch a single cart item by ID
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $cart = Cart::with(['item', 'user'])->find($id);

        if (!$cart) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $cart
        ]);
    }

    /**
     * Get cart items for a specific user
     *
     * @param int $userId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByUser($userId)
    {
        $carts = Cart::with(['item'])
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->orderBy('added_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $carts,
            'count' => $carts->count()
        ]);
    }

    /**
     * Add item to cart
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'item_id' => 'required|exists:items,id',
            'quantity' => 'nullable|integer|min:1',
            'status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Get the item to get current price
        $item = Item::find($request->item_id);
        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Item not found'
            ], 404);
        }

        // Check if item is already in cart for this user
        $existingCart = Cart::where('user_id', $request->user_id)
            ->where('item_id', $request->item_id)
            ->where('status', 'active')
            ->first();

        if ($existingCart) {
            // Update quantity if item already exists in cart
            $existingCart->quantity += $request->quantity ?? 1;
            $existingCart->price_snapshot = $item->item_price;
            $existingCart->save();

            return response()->json([
                'success' => true,
                'message' => 'Cart item quantity updated successfully',
                'data' => $existingCart->load(['item', 'user'])
            ]);
        }

        // Create new cart item
        $cart = Cart::create([
            'user_id' => $request->user_id,
            'item_id' => $request->item_id,
            'quantity' => $request->quantity ?? 1,
            'price_snapshot' => $item->item_price,
            'status' => $request->status ?? 'active',
            'added_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Item added to cart successfully',
            'data' => $cart->load(['item', 'user'])
        ], 201);
    }

    /**
     * Update a cart item
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $cart = Cart::find($id);

        if (!$cart) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'quantity' => 'sometimes|integer|min:1',
            'status' => 'sometimes|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // If quantity is being updated, also update price snapshot
        if ($request->has('quantity')) {
            $item = Item::find($cart->item_id);
            if ($item) {
                $cart->price_snapshot = $item->item_price;
            }
        }

        $cart->update($request->only(['quantity', 'status']));

        return response()->json([
            'success' => true,
            'message' => 'Cart item updated successfully',
            'data' => $cart->load(['item', 'user'])
        ]);
    }

    /**
     * Remove item from cart (soft delete by setting status to 'removed')
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $cart = Cart::find($id);

        if (!$cart) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found'
            ], 404);
        }

        // Set status to 'removed' instead of deleting
        $cart->status = 'removed';
        $cart->save();

        return response()->json([
            'success' => true,
            'message' => 'Item removed from cart successfully'
        ]);
    }

    /**
     * Clear all cart items for a user
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function clear(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $deleted = Cart::where('user_id', $request->user_id)
            ->where('status', 'active')
            ->update(['status' => 'removed']);

        return response()->json([
            'success' => true,
            'message' => 'Cart cleared successfully',
            'items_removed' => $deleted
        ]);
    }
}

