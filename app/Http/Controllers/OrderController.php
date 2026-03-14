<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\OrderItem;
use App\Models\Item;
use App\Models\Cart;
use App\Models\Notification;
use App\Models\ProofOfDelivery;
use App\Models\OrderStatus;
use App\Models\Payment;
use App\Services\PaymongoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Address;
use App\Models\Shop;

class OrderController extends Controller
{
    protected $paymongo;

    public function __construct(PaymongoService $paymongo)
    {
        $this->paymongo = $paymongo;
    }
    /**
     * Fetch all orders
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function index(Request $request)
    {
        $query = Order::with(['user', 'orderDetail', 'orderItems']);

        // Filter by user_id if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by order_status if provided
        if ($request->has('order_status')) {
            $query->where('order_status', $request->order_status);
        }

        // Order by ordered_at descending (newest first)
        $query->orderBy('ordered_at', 'desc');

        $orders = $query->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
            'count' => $orders->count()
        ]);
    }

    /**
     * Fetch a single order by ID
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $order = Order::with(['user', 'orderDetail', 'orderItems'])->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $order
        ]);
    }

    /**
     * Fetch all orders by user ID
     *
     * @param int $userId
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByUser($userId, Request $request)
    {
        $query = Order::with(['user', 'orderDetail', 'orderItems.item'])
            ->where('user_id', $userId);

        // Filter by order_status if provided
        if ($request->has('order_status')) {
            $query->where('order_status', $request->order_status);
        }

        // Order by ordered_at descending (newest first)
        $query->orderBy('ordered_at', 'desc');

        $orders = $query->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
            'count' => $orders->count()
        ]);
    }

    /**
     * Fetch order-shops by rider ID with items per order_id and shop_id from order_items.
     *
     * Sample response:
     * {
     *   "success": true,
     *   "data": [
     *     {
     *       "order_shop_id": 1,
     *       "order_id": 5,
     *       "shop_id": 2,
     *       "rider_id": 10,
     *       "order_status": 1,
     *       "order": { "id": 5, "user_id": 3, "order_detail_id": 4, "order_status": 2, "rider_id": 10, "user": {...}, "orderDetail": {"address": {...}} },
     *       "shop": { "id": 2, "shop_name": "Agrivet A", "shop_address": "...", ... },
     *       "items": [
     *         { "id": 101, "order_id": 5, "item_id": 20, "shop_id": 2, "quantity": 2, "price_at_purchase": "150.00", "item": { "id": 20, "item_name": "Product X", ... } },
     *         { "id": 102, "order_id": 5, "item_id": 21, "shop_id": 2, "quantity": 1, "price_at_purchase": "80.00", "item": { "id": 21, "item_name": "Product Y", ... } }
     *       ]
     *     },
     *     { "order_shop_id": 2, "order_id": 5, "shop_id": 3, "rider_id": 10, "order_status": 1, "order": {...}, "shop": {...}, "items": [...] }
     *   ],
     *   "count": 2
     * }
     *
     * @param int $riderId
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByRider($riderId, Request $request)
    {
        // Use rider_id from order_shops (rider is assigned per order per shop)
        $orderShopsQuery = DB::table('order_shops')
            ->where('rider_id', $riderId);

        if ($request->has('order_status')) {
            $orderShopsQuery->where('order_status', $request->order_status);
        }

        $orderShops = $orderShopsQuery->orderBy('created_at', 'desc')->get();

        if ($orderShops->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => [],
                'count' => 0,
            ]);
        }

        $orderIds = $orderShops->pluck('order_id')->unique()->values()->all();
        $shopIds = $orderShops->pluck('shop_id')->unique()->values()->all();

        $orders = Order::with(['user', 'orderDetail.address:id,recipient_name,contact_number,latitude,longitude'])
            ->whereIn('id', $orderIds)
            ->get()
            ->keyBy('id');

        $shops = Shop::whereIn('id', $shopIds)->get()->keyBy('id');

        $orderItems = OrderItem::with('item')
            ->whereIn('order_id', $orderIds)
            ->get();

        $itemsByOrderAndShop = $orderItems->groupBy(function ($oi) {
            return $oi->order_id . '_' . $oi->shop_id;
        });

        $data = $orderShops->map(function ($os) use ($orders, $shops, $itemsByOrderAndShop) {
            $key = $os->order_id . '_' . $os->shop_id;
            $items = $itemsByOrderAndShop->get($key, collect())->values()->all();

            return [
                'order_shop_id' => $os->id,
                'order_id' => $os->order_id,
                'shop_id' => $os->shop_id,
                'rider_id' => $os->rider_id,
                'order_status' => $os->order_status,
                'order' => $orders->get($os->order_id),
                'shop' => $shops->get($os->shop_id),
                'items' => $items,
            ];
        })->values()->all();

        return response()->json([
            'success' => true,
            'data' => $data,
            'count' => count($data),
        ]);
    }

    /**
     * Get order details joined with orders by user ID
     *
     * @param int $userId
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getOrderDetailsByUser($userId, Request $request)
    {
        $query = OrderDetail::join('orders', 'order_details.id', '=', 'orders.order_detail_id')
            ->where('orders.user_id', $userId)
            ->select(
                'order_details.*',
                'orders.id as order_id',
                'orders.user_id',
                'orders.order_status',
                'orders.ordered_at',
            );

        // Filter by order_status if provided
        if ($request->has('order_status')) {
            $query->where('orders.order_status', $request->order_status);
        }

        // Filter by payment_status if provided
        if ($request->has('payment_status')) {
            $query->where('order_details.payment_status', $request->payment_status);
        }

        // Order by ordered_at descending (newest first)
        $query->orderBy('orders.ordered_at', 'desc');

        $orderDetails = $query->get();

        return response()->json([
            'success' => true,
            'data' => $orderDetails,
            'count' => $orderDetails->count()
        ]);
    }

    /**
     * Create a new order with order details
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $data = $request->all();

        $validator = Validator::make($data, [
            // Order fields
            'user_id' => 'required|exists:users,id',
            'order_status' => 'nullable|integer|exists:order_status,id',
            'ordered_at' => 'nullable|date',
            
            // Order detail fields
            'order_code' => 'nullable|string|max:100|unique:order_details,order_code',
            'subtotal' => 'required|numeric|min:0',
            'shipping_fee' => 'nullable|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'shipping_address' => 'required|string',
            'shipping_address_id' => 'required|exists:addresses,id',
            'order_instruction' => 'nullable|string',
            'delivery_method_id' => 'required|exists:delivery_method,id',
            'payment_method' => 'required|string|max:50',
            'payment_status' => 'nullable|string|max:50',
            
            // Order items
            'items' => 'required|array|min:1',
            'items.*.cart_id' => 'required|exists:carts,id',
            'items.*.item_id' => 'required|exists:items,id',
            'items.*.shop_id' => 'required|exists:shops,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price_at_purchase' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Use database transaction to ensure atomicity and prevent race conditions
        return DB::transaction(function () use ($data) {
            // Check inventory availability inside transaction to prevent race conditions
            $lockedItems = [];
            foreach ($data['items'] as $item) {
                // Lock the item row for update to prevent concurrent modifications
                $itemModel = Item::lockForUpdate()->find($item['item_id']);
                
                if (!$itemModel) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Item not found',
                        'item_id' => $item['item_id']
                    ], 404);
                }

                $orderedQuantity = (int) $item['quantity'];
                $availableQuantity = $itemModel->item_quantity;
                $result = $availableQuantity - $orderedQuantity;

                if ($result < 0) {
                    return response()->json([
                        'success' => false,
                        'message' => "Sorry, we don't have enough stock for \"{$itemModel->item_name}\". Only {$availableQuantity} item(s) available, but you requested {$orderedQuantity}.",
                        'item_id' => $item['item_id'],
                        'item_name' => $itemModel->item_name,
                        'available_quantity' => $availableQuantity,
                        'ordered_quantity' => $orderedQuantity,
                        'shortage' => abs($result)
                    ], 400);
                }

                // Store locked item for later update
                $lockedItems[$item['item_id']] = [
                    'model' => $itemModel,
                    'ordered_quantity' => $orderedQuantity
                ];
            }
            // Create order detail first
            $orderDetailData = [
                'order_code' => $data['order_code'] ?? '#ORD-' . strtoupper(Str::random(10)),
                'subtotal' => $data['subtotal'],
                'shipping_fee' => $data['shipping_fee'] ?? 0.00,
                'total_amount' => $data['total_amount'],
                'address_id' => $data['shipping_address_id'],
                'shipping_address' => Address::find($data['shipping_address_id'])->full_address,//get the shipping address from the addresses table
                'order_instruction' => $data['order_instruction'] ?? null,
                'delivery_method_id' => $data['delivery_method_id'],
                'payment_method' => $data['payment_method'],
                'payment_status' => $data['payment_status'] ?? 'pending',
            ];

            $orderDetail = OrderDetail::create($orderDetailData);

            // Create order
            // Get pending order status ID from order_status table
            $pendingStatus = OrderStatus::where('stat_description', 'Pending')->first();
            $pendingStatusId = $pendingStatus ? $pendingStatus->id : 1; // Default to 1 if not found
            
            $orderData = [
                'user_id' => $data['user_id'],
                'order_detail_id' => $orderDetail->id,
                'order_status' => $data['order_status'] ?? $pendingStatusId,
                'ordered_at' => $data['ordered_at'] ?? now(),
            ];

            $order = Order::create($orderData);

            // Create order items and update item inventory
            if (isset($data['items']) && is_array($data['items'])) {
                foreach ($data['items'] as $item) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'item_id' => (int) $item['item_id'],
                        'shop_id' => (int) $item['shop_id'],
                        'quantity' => (int) $item['quantity'],
                        'price_at_purchase' => (float) $item['price_at_purchase'],
                        'item_status' => 1,
                    ]);

                    // Update item quantity and sold_count using locked item
                    if (isset($lockedItems[$item['item_id']])) {
                        $itemModel = $lockedItems[$item['item_id']]['model'];
                        $orderedQuantity = $lockedItems[$item['item_id']]['ordered_quantity'];
                        $itemModel->item_quantity -= $orderedQuantity;
                        $itemModel->sold_count += $orderedQuantity;
                        $itemModel->save();
                    }
                }

                // Populate order_shops: one entry per unique shop_id in this order
                $uniqueShopIds = array_values(array_unique(array_column($data['items'], 'shop_id')));
                $now = now();
                $orderShopRows = array_map(function ($shopId) use ($order, $pendingStatusId, $now) {
                    return [
                        'order_id' => $order->id,
                        'shop_id' => (int) $shopId,
                        'rider_id' => null,
                        'order_status' => $pendingStatusId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }, $uniqueShopIds);
                if (!empty($orderShopRows)) {
                    DB::table('order_shops')->insert($orderShopRows);
                }
            }

            // Update cart items status to 'co' (checked out) for ordered items
            // Only update items that are not already 'co'
            // Extract cart_ids and item_ids from items array
            $cartIds = array_column($data['items'], 'cart_id');
            $orderedItemIds = array_column($data['items'], 'item_id');
            
            // Update carts that match user_id, cart_id, and item_id
            Cart::where('user_id', $data['user_id'])
                ->whereIn('id', $cartIds)
                ->whereIn('item_id', $orderedItemIds)
                ->where('status', '!=', 'co')
                ->update(['status' => 'co']);

            // Load relationships
            $order->load(['user', 'orderDetail', 'orderItems']);

            // Create notification for the user
            Notification::createForUser(
                $data['user_id'],
                'order_placed',
                'Order Placed Successfully',
                "Your order {$orderDetail->order_code} has been placed successfully. Total amount: ₱" . number_format($orderDetail->total_amount, 2),
                Notification::CATEGORY_ORDER,
                $order,
                [
                    'order_id' => $order->id,
                    'order_code' => $orderDetail->order_code,
                    'total_amount' => $orderDetail->total_amount,
                    'items_count' => count($data['items']),
                ],
                "/orders/{$order->id}"
            );

            $responseData = [
                'success' => true,
                'message' => 'Order created successfully',
                'data' => $order,
            ];

            if ($data['payment_method'] !== 'cod') {
                $session = $this->paymongo->createCheckoutSession($orderDetail->total_amount);

                Payment::create([
                    'order_id' => $order->id,
                    'checkout_session_id' => $session['data']['id'],
                    'checkout_url' => $session['data']['attributes']['checkout_url'],
                    'amount' => $orderDetail->total_amount,
                    'status' => 'pending',
                ]);

                $responseData['checkout_url'] = $session['data']['attributes']['checkout_url'];
                $responseData['session_id'] = $session['data']['id'];
            }

            return response()->json($responseData, 201);
        });
    }

    /**
     * Update an existing order and/or order details
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $order = Order::with('orderDetail')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            // Order fields
            'user_id' => 'sometimes|exists:users,id',
            'order_status' => 'nullable|integer|exists:order_status,id',
            'ordered_at' => 'nullable|date',
            
            // Order detail fields
            'order_code' => 'sometimes|string|max:100|unique:order_details,order_code,' . $order->order_detail_id,
            'subtotal' => 'sometimes|numeric|min:0',
            'shipping_fee' => 'nullable|numeric|min:0',
            'total_amount' => 'sometimes|numeric|min:0',
            'shipping_address' => 'sometimes|string',
            'order_instruction' => 'nullable|string',
            'delivery_method_id' => 'sometimes|exists:delivery_method,id',
            'payment_method' => 'sometimes|string|max:50',
            'payment_status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Update order detail if any order detail fields are provided
        $orderDetailFields = [
            'order_code', 'subtotal', 'shipping_fee', 'total_amount',
            'shipping_address', 'order_instruction', 'delivery_method_id', 'payment_method', 'payment_status'
        ];

        $orderDetailData = [];
        foreach ($orderDetailFields as $field) {
            if ($request->has($field)) {
                $orderDetailData[$field] = $request->$field;
            }
        }

        if (!empty($orderDetailData) && $order->orderDetail) {
            $order->orderDetail->update($orderDetailData);
        }

        // Update order if any order fields are provided
        $orderFields = ['user_id', 'order_status', 'ordered_at'];
        $orderUpdateData = [];
        foreach ($orderFields as $field) {
            if ($request->has($field)) {
                $orderUpdateData[$field] = $request->$field;
            }
        }

        // Check if order_status is being changed to in-transit
        $oldStatus = $order->order_status;
        $newStatus = $request->has('order_status') ? $request->order_status : null;

        if (!empty($orderUpdateData)) {
            $order->update($orderUpdateData);
            // Update order_status in order_shops only for the specific order_id and shop_id when shop_id is provided
            if (isset($orderUpdateData['order_status']) && $request->has('shop_id')) {
                DB::table('order_shops')
                    ->where('order_id', $order->id)
                    ->where('shop_id', $request->shop_id)
                    ->update(['order_status' => $orderUpdateData['order_status']]);
            }
        }

        // Create POD entry if status changed to in-transit (status ID: 5)
        if ($newStatus && (int)$newStatus === 5 && $oldStatus !== $newStatus) {
            $this->createProofOfDeliveryEntry($order);
        }

        // Load relationships
        $order->load(['user', 'orderDetail', 'orderItems']);

        return response()->json([
            'success' => true,
            'message' => 'Order updated successfully',
            'data' => $order
        ]);
    }

    /**
     * Update order status by order ID
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function updateStatus(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|integer|exists:order_status,id',
            'shop_id' => 'required|integer|exists:shops,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $order = Order::find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }

        // Store old status before update
        $oldStatus = $order->order_status;
        $newStatus = $request->status;

        $order->update(['order_status' => $newStatus]);

        // Update order_status only for the specific order_id and shop_id in order_shops
        DB::table('order_shops')
            ->where('order_id', $order->id)
            ->where('shop_id', $request->shop_id)
            ->update(['order_status' => $newStatus]);

        // Create POD entry if status changed to in-transit (status ID: 5)
        if ((int)$newStatus === 5 && $oldStatus !== $newStatus) {
            $this->createProofOfDeliveryEntry($order);
        }

        // Load relationships
        $order->load(['user', 'orderDetail', 'orderItems']);

        return response()->json([
            'success' => true,
            'message' => 'Order status updated successfully',
            'data' => $order
        ]);
    }

    /**
     * Create proof of delivery entry when order status changes to in-transit (status ID: 5)
     *
     * @param Order $order
     * @return void
     */
    private function createProofOfDeliveryEntry(Order $order)
    {
        // Check if order has id
        if (!$order->id) {
            return;
        }

        // Check if POD entry already exists for this order
        $existingPOD = ProofOfDelivery::where('order_id', $order->id)
            ->where('status', 'pending')
            ->first();

        // Only create if no pending POD entry exists
        if (!$existingPOD) {
            ProofOfDelivery::create([
                'order_id' => $order->id,
                'rider_id' => $order->rider_id,
                'latitude' => null,
                'longitude' => null,
                'image_path' => null,
                'remarks' => null,
                'status' => 'pending',
            ]);
        }
    }

    /**
     * Delete an order
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $order = Order::with('orderDetail')->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }

        // Update order status to Cancelled instead of deleting
        $cancelledStatus = OrderStatus::where('stat_description', 'Cancelled')->first();
        $cancelledStatusId = $cancelledStatus ? $cancelledStatus->id : 7; // Default to 7 if not found
        $order->update(['order_status' => $cancelledStatusId]);

        // Refresh the model to get updated values and load relationships
        $order->refresh();
        $order->load(['user', 'orderDetail', 'orderItems']);

        // Create notification for order cancellation
        Notification::createForUser(
            $order->user_id,
            'order_cancelled',
            'Order Cancelled',
            "Your order {$order->orderDetail->order_code} has been cancelled.",
            Notification::CATEGORY_ORDER,
            $order,
            [
                'order_id' => $order->id,
                'order_code' => $order->orderDetail->order_code,
                'total_amount' => $order->orderDetail->total_amount,
            ],
            "/orders/{$order->id}"
        );

        return response()->json([
            'success' => true,
            'message' => 'Order cancelled successfully',
            'data' => $order
        ]);
    }
}

