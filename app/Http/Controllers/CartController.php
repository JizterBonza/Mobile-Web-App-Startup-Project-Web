<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Models\Cart;
use App\Models\DiscountLog;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    use EnsuresApiOwnership;

    /** Cart select: exclude status, created_at, updated_at */
    private const CART_SELECT = ['id', 'user_id', 'item_id', 'quantity', 'price_snapshot'];

    /** Item select: exclude item_status, created_at, updated_at */
    private const ITEM_SELECT = ['id', 'shop_id', 'item_name', 'item_description', 'item_price', 'discount_percent', 'discount_type', 'discount_expires_at', 'item_quantity', 'category', 'item_images', 'average_rating', 'total_reviews', 'sold_count'];

    /** Shop select: exclude shop_status, created_at, updated_at */
    private const SHOP_SELECT = ['id', 'agrivet_id', 'zone_id', 'shop_name', 'shop_description', 'shop_address', 'shop_city', 'shop_postal_code', 'shop_province', 'shop_lat', 'shop_long', 'contact_number', 'average_rating', 'total_reviews'];

    /** Eager load for cart response with constrained columns */
    private function cartWith(bool $includeUser = true): array
    {
        $with = [
            'item:' . implode(',', self::ITEM_SELECT),
            'item.shop:' . implode(',', self::SHOP_SELECT),
            'item.shop.zone:id,name,is_cod',
            'item.activeDiscountLog',
        ];

        if ($includeUser) {
            $with[] = 'user';
        }

        return $with;
    }

    private function ensureDiscountLogIsValid(Item $item): ?DiscountLog
    {
        if (!$item->relationLoaded('activeDiscountLog') || !$item->activeDiscountLog) {
            return null;
        }

        return $item->activeDiscountLog->deactivateIfExpired()
            ? $item->activeDiscountLog
            : null;
    }

    private function buildDiscountDetails(Item $item): ?array
    {
        $log = $this->ensureDiscountLogIsValid($item);

        if ($item->getActiveDiscountPercent() <= 0 || !$log) {
            return null;
        }

        return [
            'original_price' => $log->original_price,
            'actual_discount' => $log->actual_discount,
            'discounted_price' => $log->discounted_price,
            'discount_percent' => $log->discount_percent,
            'discount_type' => $log->discount_type,
            'discount_expires_at' => $log->discount_expires_at,
        ];
    }

    private function formatCart(Cart $cart): array
    {
        $item = $cart->relationLoaded('item') ? $cart->item : null;
        $discountedPrice = $item ? $item->getEffectivePrice() : null;
        $discountDetails = $item ? $this->buildDiscountDetails($item) : null;
        $discountStatus = $discountDetails !== null ? 'active' : 'inactive';

        $data = [
            'id' => $cart->id,
            'user_id' => $cart->user_id,
            'item_id' => $cart->item_id,
            'quantity' => $cart->quantity,
            'price_snapshot' => $cart->price_snapshot,
            'discounted_price' => $discountedPrice,
            'discount_status' => $discountStatus,
            'discount_details' => $discountDetails,
        ];

        if ($item) {
            $itemData = $item->toArray();
            unset($itemData['active_discount_log']);
            $data['item'] = $itemData;
        }

        if ($cart->relationLoaded('user') && $cart->user) {
            $data['user'] = $cart->user->toArray();
        }

        return $data;
    }

    private function formatCarts($carts): array
    {
        return $carts->map(fn (Cart $cart) => $this->formatCart($cart))->values()->all();
    }

    public function index(Request $request)
    {
        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $userId = $this->authUserId($request);

        $query = Cart::select(self::CART_SELECT)
            ->with($this->cartWith())
            ->where('user_id', $userId);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', 'active');
        }

        $query->orderBy('created_at', 'desc');

        $carts = $query->get();

        return response()->json([
            'success' => true,
            'data' => $this->formatCarts($carts),
            'count' => $carts->count()
        ]);
    }

    public function show(Request $request, $id)
    {
        $cart = Cart::select(self::CART_SELECT)
            ->with($this->cartWith())
            ->find($id);

        if (!$cart) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $cart->user_id)) {
            return $response;
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatCart($cart)
        ]);
    }

    public function getByUser(Request $request, $userId)
    {
        if ($response = $this->ensureSelfOrStaff($request, $userId)) {
            return $response;
        }

        $carts = Cart::select(self::CART_SELECT)
            ->with($this->cartWith(false))
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $this->formatCarts($carts),
            'count' => $carts->count()
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|integer',
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

        $existingCart = Cart::where('user_id', $userId)
            ->where('item_id', $request->item_id)
            ->where('status', 'active')
            ->first();

        if ($existingCart) {
            $existingCart->quantity += $request->quantity ?? 1;
            $existingCart->price_snapshot = $item->getEffectivePrice();
            $existingCart->save();

            $existingCart->load($this->cartWith());
            return response()->json([
                'success' => true,
                'message' => 'Cart item quantity updated successfully',
                'data' => $this->formatCart($existingCart)
            ]);
        }

        $cart = Cart::create([
            'user_id' => $userId,
            'item_id' => $request->item_id,
            'quantity' => $request->quantity ?? 1,
            'price_snapshot' => $item->getEffectivePrice(),
            'status' => $request->status ?? 'active',
            'created_at' => now(),
        ]);

        $cart->load($this->cartWith());
        return response()->json([
            'success' => true,
            'message' => 'Item added to cart successfully',
            'data' => $this->formatCart($cart)
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $cart = Cart::find($id);

        if (!$cart) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $cart->user_id)) {
            return $response;
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

        if ($request->has('quantity')) {
            $item = Item::find($cart->item_id);
            if ($item) {
                $cart->price_snapshot = $item->getEffectivePrice();
            }
        }

        $cart->update($request->only(['quantity', 'status']));

        $cart->load($this->cartWith());
        return response()->json([
            'success' => true,
            'message' => 'Cart item updated successfully',
            'data' => $this->formatCart($cart)
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $cart = Cart::find($id);

        if (!$cart) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found'
            ], 404);
        }

        if ($response = $this->ensureResourceOwner($request, $cart->user_id)) {
            return $response;
        }

        $cart->status = 'removed';
        $cart->save();

        return response()->json([
            'success' => true,
            'message' => 'Item removed from cart successfully'
        ]);
    }

    public function clear(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'sometimes|integer',
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

        $deleted = Cart::where('user_id', $this->authUserId($request))
            ->where('status', 'active')
            ->update(['status' => 'removed']);

        return response()->json([
            'success' => true,
            'message' => 'Cart cleared successfully',
            'items_removed' => $deleted
        ]);
    }
}
