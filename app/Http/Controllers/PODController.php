<?php

namespace App\Http\Controllers;

use App\Models\ProofOfDelivery;
use App\Models\OrderDetail;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PODController extends Controller
{
    /**
     * Store a new proof of delivery.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        // Validate the request
        $validator = Validator::make($request->all(), [
            'orderId' => 'required|exists:orders,id',
            'riderId' => 'nullable|exists:users,id',
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'remarks' => 'nullable|string|max:1000',
            'status' => 'nullable|string|in:pending,delivered,failed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Find the order using orders.id sent by the app
        $order = Order::find($request->orderId);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found'
            ], 404);
        }

        // Find the order detail using order_detail_id from the order
        $orderDetail = OrderDetail::find($order->order_detail_id);
        if (!$orderDetail) {
            return response()->json([
                'success' => false,
                'message' => 'Order detail not found'
            ], 404);
        }

        // Get rider_id: prioritize request, then from order_shops for this order
        $riderId = $request->riderId;
        if (!$riderId) {
            $riderId = DB::table('order_shops')
                ->where('order_id', $order->id)
                ->whereNotNull('rider_id')
                ->value('rider_id');
        }

        try {
            // Check if POD entry already exists for this order
            $proofOfDelivery = ProofOfDelivery::where('order_id', $order->id)->first();

            // Handle image upload
            $imagePath = null;
            if ($request->hasFile('image')) {
                // If updating existing POD, delete old image if exists
                if ($proofOfDelivery && $proofOfDelivery->image_path) {
                    $oldPath = str_replace('/storage/', '', $proofOfDelivery->image_path);
                    if (Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                }

                // Generate a unique filename to prevent conflicts
                $filename = Str::uuid() . '_' . time() . '.' . $request->file('image')->getClientOriginalExtension();

                // Store the image in pod_images directory
                $path = $request->file('image')->storeAs('pod_images', $filename, 'public');

                // Save the full path for database storage
                $imagePath = '/storage/' . $path;
            }

            if ($proofOfDelivery) {
                // Update existing POD entry
                $proofOfDelivery->update([
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'image_path' => $imagePath,
                    'remarks' => $request->remarks,
                    'status' => $request->status ?? 'pending',
                ]);

                $message = 'Proof of delivery updated successfully';
                $statusCode = 200;
            } else {
                // Create new proof of delivery record using order id
                $proofOfDelivery = ProofOfDelivery::create([
                    'order_id' => $order->id,
                    'rider_id' => $riderId,
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'image_path' => $imagePath,
                    'remarks' => $request->remarks,
                    'status' => $request->status ?? 'pending',
                ]);

                $message = 'Proof of delivery created successfully';
                $statusCode = 201;
            }

            // Load the relationship for response
            $proofOfDelivery->load('order.orderDetail');

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'id' => $proofOfDelivery->id,
                    'orderId' => $proofOfDelivery->order_id,
                    'riderId' => $proofOfDelivery->rider_id,
                    'imagePath' => $proofOfDelivery->image_path,
                    'timestamp' => $proofOfDelivery->created_at->toISOString(),
                    'latitude' => $proofOfDelivery->latitude ? (float) $proofOfDelivery->latitude : null,
                    'longitude' => $proofOfDelivery->longitude ? (float) $proofOfDelivery->longitude : null,
                    'remarks' => $proofOfDelivery->remarks,
                    'status' => $proofOfDelivery->status,
                    'orderDetail' => $proofOfDelivery->orderDetail,
                ]
            ], $statusCode);

        } catch (\Exception $e) {
            // If image was uploaded but database save failed, delete the image
            if (isset($imagePath) && $imagePath) {
                $pathToDelete = str_replace('/storage/', '', $imagePath);
                if (Storage::disk('public')->exists($pathToDelete)) {
                    Storage::disk('public')->delete($pathToDelete);
                }
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to create proof of delivery',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get proof of delivery by order ID.
     *
     * @param string $orderId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByOrder($orderId)
    {
        $proofOfDeliveries = ProofOfDelivery::where('order_id', $orderId)
            ->with('order.orderDetail')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $proofOfDeliveries->map(function ($pod) {
                return [
                    'id' => $pod->id,
                    'orderId' => $pod->order_id,
                    'riderId' => $pod->rider_id,
                    'imagePath' => $pod->image_path,
                    'timestamp' => $pod->created_at->toISOString(),
                    'latitude' => $pod->latitude ? (float) $pod->latitude : null,
                    'longitude' => $pod->longitude ? (float) $pod->longitude : null,
                    'remarks' => $pod->remarks,
                    'status' => $pod->status,
                    'orderDetail' => $pod->orderDetail,
                ];
            }),
            'count' => $proofOfDeliveries->count()
        ]);
    }

    /**
     * Get proof of delivery by rider ID.
     *
     * @param int $riderId
     * @return \Illuminate\Http\JsonResponse
     */
    public function getByRider($riderId)
    {
        $proofOfDeliveries = ProofOfDelivery::where('rider_id', $riderId)
            ->with('order.orderDetail')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $proofOfDeliveries->map(function ($pod) {
                return [
                    'id' => $pod->id,
                    'orderId' => $pod->order_id,
                    'riderId' => $pod->rider_id,
                    'imagePath' => $pod->image_path,
                    'timestamp' => $pod->created_at->toISOString(),
                    'latitude' => $pod->latitude ? (float) $pod->latitude : null,
                    'longitude' => $pod->longitude ? (float) $pod->longitude : null,
                    'remarks' => $pod->remarks,
                    'status' => $pod->status,
                    'orderDetail' => $pod->orderDetail,
                ];
            }),
            'count' => $proofOfDeliveries->count()
        ]);
    }

    /**
     * Get a single proof of delivery by ID.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function show($id)
    {
        $proofOfDelivery = ProofOfDelivery::with('order.orderDetail')->find($id);

        if (!$proofOfDelivery) {
            return response()->json([
                'success' => false,
                'message' => 'Proof of delivery not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $proofOfDelivery->id,
                'orderId' => $proofOfDelivery->order_id,
                'riderId' => $proofOfDelivery->rider_id,
                'imagePath' => $proofOfDelivery->image_path,
                'timestamp' => $proofOfDelivery->created_at->toISOString(),
                'latitude' => $proofOfDelivery->latitude ? (float) $proofOfDelivery->latitude : null,
                'longitude' => $proofOfDelivery->longitude ? (float) $proofOfDelivery->longitude : null,
                'remarks' => $proofOfDelivery->remarks,
                'status' => $proofOfDelivery->status,
                'orderDetail' => $proofOfDelivery->orderDetail,
            ]
        ]);
    }

    /**
     * Update proof of delivery.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update(Request $request, $id)
    {
        $proofOfDelivery = ProofOfDelivery::find($id);

        if (!$proofOfDelivery) {
            return response()->json([
                'success' => false,
                'message' => 'Proof of delivery not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'remarks' => 'nullable|string|max:1000',
            'status' => 'nullable|string|in:pending,delivered,failed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updateData = [];

            if ($request->hasFile('image')) {
                if ($proofOfDelivery->image_path) {
                    $oldPath = str_replace('/storage/', '', $proofOfDelivery->image_path);
                    if (Storage::disk('public')->exists($oldPath)) {
                        Storage::disk('public')->delete($oldPath);
                    }
                }

                $filename = Str::uuid() . '_' . time() . '.' . $request->file('image')->getClientOriginalExtension();
                $path = $request->file('image')->storeAs('pod_images', $filename, 'public');
                $updateData['image_path'] = '/storage/' . $path;
            }

            if ($request->has('latitude')) {
                $updateData['latitude'] = $request->latitude;
            }

            if ($request->has('longitude')) {
                $updateData['longitude'] = $request->longitude;
            }

            if ($request->has('remarks')) {
                $updateData['remarks'] = $request->remarks;
            }

            if ($request->has('status')) {
                $updateData['status'] = $request->status;
            }

            if (!empty($updateData)) {
                $proofOfDelivery->update($updateData);
            }

            $proofOfDelivery->load('order.orderDetail');

            return response()->json([
                'success' => true,
                'message' => 'Proof of delivery updated successfully',
                'data' => [
                    'id' => $proofOfDelivery->id,
                    'orderId' => $proofOfDelivery->order_id,
                    'riderId' => $proofOfDelivery->rider_id,
                    'imagePath' => $proofOfDelivery->image_path,
                    'timestamp' => $proofOfDelivery->updated_at->toISOString(),
                    'latitude' => $proofOfDelivery->latitude ? (float) $proofOfDelivery->latitude : null,
                    'longitude' => $proofOfDelivery->longitude ? (float) $proofOfDelivery->longitude : null,
                    'remarks' => $proofOfDelivery->remarks,
                    'status' => $proofOfDelivery->status,
                    'orderDetail' => $proofOfDelivery->orderDetail,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update proof of delivery',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete proof of delivery.
     *
     * @param int $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function destroy($id)
    {
        $proofOfDelivery = ProofOfDelivery::find($id);

        if (!$proofOfDelivery) {
            return response()->json([
                'success' => false,
                'message' => 'Proof of delivery not found'
            ], 404);
        }

        try {
            if ($proofOfDelivery->image_path) {
                $pathToDelete = str_replace('/storage/', '', $proofOfDelivery->image_path);
                if (Storage::disk('public')->exists($pathToDelete)) {
                    Storage::disk('public')->delete($pathToDelete);
                }
            }

            $proofOfDelivery->delete();

            return response()->json([
                'success' => true,
                'message' => 'Proof of delivery deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete proof of delivery',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}