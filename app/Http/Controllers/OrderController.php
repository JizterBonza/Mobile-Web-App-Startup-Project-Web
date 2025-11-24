<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

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
        $query = Order::with(['user', 'orderDetail', 'orderItems'])
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
        $validator = Validator::make($request->all(), [
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
            'drop_location_lat' => 'nullable|numeric|between:-90,90',
            'drop_location_long' => 'nullable|numeric|between:-180,180',
            'order_instruction' => 'nullable|string',
            'payment_method' => 'required|string|max:50',
            'payment_status' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        // Create order detail first
        $orderDetailData = [
            'order_code' => '#ORD-' . $request->order_code ?? '#ORD-' . strtoupper(Str::random(10)),
            'subtotal' => $request->subtotal,
            'shipping_fee' => $request->shipping_fee ?? 0.00,
            'total_amount' => $request->total_amount,
            'shipping_address' => $request->shipping_address,
            'drop_location_lat' => $request->drop_location_lat,
            'drop_location_long' => $request->drop_location_long,
            'order_instruction' => $request->order_instruction,
            'payment_method' => $request->payment_method,
            'payment_status' => $request->payment_status ?? 'pending',
        ];

        $orderDetail = OrderDetail::create($orderDetailData);

        // Create order
        $orderData = [
            'user_id' => $request->user_id,
            'order_detail_id' => $orderDetail->id,
            'order_status' => $request->order_status ?? 'pending',
            'ordered_at' => $request->ordered_at ?? now(),
        ];

        $order = Order::create($orderData);

        // Load relationships
        $order->load(['user', 'orderDetail', 'orderItems']);

        return response()->json([
            'success' => true,
            'message' => 'Order created successfully',
            'data' => $order
        ], 201);
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
            'drop_location_lat' => 'nullable|numeric|between:-90,90',
            'drop_location_long' => 'nullable|numeric|between:-180,180',
            'order_instruction' => 'nullable|string',
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
            'shipping_address', 'drop_location_lat', 'drop_location_long',
            'order_instruction', 'payment_method', 'payment_status'
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

        if (!empty($orderUpdateData)) {
            $order->update($orderUpdateData);
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

        // Delete order detail if it exists
        if ($order->orderDetail) {
            $order->orderDetail->delete();
        }

        $order->delete();

        return response()->json([
            'success' => true,
            'message' => 'Order deleted successfully'
        ]);
    }
}

