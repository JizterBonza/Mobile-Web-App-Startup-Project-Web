<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderDetail;
use App\Models\OrderItem;
use App\Models\Item;
use App\Models\Cart;
use App\Models\Notification;
use App\Models\ProofOfDelivery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Address;

class OrderController extends Controller
{
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
     * Fetch all orders by rider ID
     *
     * @param int $riderId
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByRider($riderId, Request $request)
    {
        $query = Order::with(['user', 'orderDetail.address:id,recipient_name,contact_number,latitude,longitude', 'orderItems.item'])
            ->where('rider_id', $riderId);

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
            'order_status' => 'nullable|string|max:50',
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
            $orderData = [
                'user_id' => $data['user_id'],
                'order_detail_id' => $orderDetail->id,
                'order_status' => $data['order_status'] ?? 'pending',
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
                        'item_status' => 'ordered',
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

            return response()->json([
                'success' => true,
                'message' => 'Order created successfully',
                'data' => $order
            ], 201);
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
            'order_status' => 'nullable|string|max:50',
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
        }

        // Create POD entry if status changed to in-transit
        if ($newStatus && strtolower($newStatus) === 'in-transit' && $oldStatus !== $newStatus) {
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
            'status' => 'required|string|max:50',
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

        // Create POD entry if status changed to in-transit
        if (strtolower($newStatus) === 'in-transit' && $oldStatus !== $newStatus) {
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
     * Create proof of delivery entry when order status changes to in-transit
     *
     * @param Order $order
     * @return void
     */
    private function createProofOfDeliveryEntry(Order $order)
    {
        // Check if order has order_detail_id
        if (!$order->order_detail_id) {
            return;
        }

        // Check if POD entry already exists for this order
        $existingPOD = ProofOfDelivery::where('order_id', $order->order_detail_id)
            ->where('status', 'pending')
            ->first();

        // Only create if no pending POD entry exists
        if (!$existingPOD) {
            ProofOfDelivery::create([
                'order_id' => $order->order_detail_id,
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
        $order->update(['order_status' => 'Cancelled']);

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

