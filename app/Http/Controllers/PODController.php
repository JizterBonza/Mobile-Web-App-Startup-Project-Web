<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Models\ProofOfDelivery;
use App\Models\OrderDetail;
use App\Models\Order;
use App\Models\OrderShop;
use App\Models\User;
use App\Services\OrderStatusTransitionService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PODController extends Controller
{
    use EnsuresApiOwnership;

    public function __construct(
        private readonly OrderStatusTransitionService $statusTransitions,
    ) {}

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
            'orderShopId' => 'nullable|integer|exists:order_shops,id',
            'riderId' => 'nullable|exists:users,id',
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'remarks' => 'nullable|string|max:1000',
            'status' => 'nullable|string|in:delivered,failed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Find the order using orders.id sent by the app
        $order = Order::with('orderShops')->find($request->orderId);
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

        if ($request->filled('orderShopId')) {
            $orderShop = $order->orderShops->firstWhere('id', (int) $request->orderShopId);
            if (! $orderShop) {
                return response()->json([
                    'success' => false,
                    'message' => 'The selected order shop does not belong to this order.',
                ], 422);
            }
        } elseif ($order->orderShops->count() === 1) {
            $orderShop = $order->orderShops->first();
        } else {
            return response()->json([
                'success' => false,
                'message' => 'orderShopId is required for a multi-shop order.',
                'errors' => ['orderShopId' => ['Select the shop leg this proof belongs to.']],
            ], 422);
        }

        $actor = $request->user();
        if ($actor->user_type !== User::TYPE_RIDER
            || $orderShop->rider_id === null
            || (int) $orderShop->rider_id !== (int) $actor->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Only the rider assigned to this shop order may upload proof of delivery.',
            ], 403);
        }

        if ($request->filled('riderId') && (int) $request->riderId !== (int) $actor->id) {
            return response()->json([
                'success' => false,
                'message' => 'riderId does not match the authenticated rider.',
            ], 403);
        }

        $inTransitStatusId = DB::table('order_status')
            ->where('stat_description', 'In-Transit')
            ->value('id');
        if ((int) $orderShop->order_status !== (int) $inTransitStatusId) {
            return response()->json([
                'success' => false,
                'message' => 'Proof may only be submitted while this shop order is in transit.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $orderShop = OrderShop::query()->lockForUpdate()->findOrFail($orderShop->id);
            if ((int) $orderShop->order_status !== (int) $inTransitStatusId) {
                throw ValidationException::withMessages([
                    'orderShopId' => ['This shop order is no longer in transit.'],
                ]);
            }

            // One proof lifecycle per shop leg.
            $proofOfDelivery = ProofOfDelivery::where('order_shop_id', $orderShop->id)
                ->lockForUpdate()
                ->first();
            $oldImagePath = $proofOfDelivery?->image_path;

            // Handle image upload
            $imagePath = null;
            if ($request->hasFile('image')) {
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
                    'status' => $request->input('status', 'delivered'),
                ]);

                $message = 'Proof of delivery updated successfully';
                $statusCode = 200;
            } else {
                // Create new proof of delivery record using order id
                $proofOfDelivery = ProofOfDelivery::create([
                    'order_id' => $order->id,
                    'order_shop_id' => $orderShop->id,
                    'rider_id' => $actor->id,
                    'latitude' => $request->latitude,
                    'longitude' => $request->longitude,
                    'image_path' => $imagePath,
                    'remarks' => $request->remarks,
                    'status' => $request->input('status', 'delivered'),
                ]);

                $message = 'Proof of delivery created successfully';
                $statusCode = 201;
            }

            if ($proofOfDelivery->status === 'delivered') {
                $deliveredStatusId = (int) DB::table('order_status')
                    ->where('stat_description', 'Delivered')
                    ->value('id');

                $this->statusTransitions->transition(
                    $orderShop,
                    $deliveredStatusId,
                    $actor,
                    [
                        'notes' => $request->input('remarks'),
                        'source' => 'pod_upload',
                        'proof_verified' => true,
                        'metadata' => ['proof_of_delivery_id' => $proofOfDelivery->id],
                    ],
                );
                $message = 'Proof of delivery uploaded and order marked as delivered';
            } else {
                $this->statusTransitions->recordEvent(
                    $orderShop->fresh(['status']),
                    'delivery_failed',
                    $actor,
                    $request->input('remarks'),
                    [
                        'source' => 'pod_upload',
                        'proof_of_delivery_id' => $proofOfDelivery->id,
                    ],
                );
                $message = 'Failed delivery attempt recorded';
            }

            DB::commit();

            if ($oldImagePath && $oldImagePath !== $imagePath) {
                $oldPath = str_replace('/storage/', '', $oldImagePath);
                if (Storage::disk('public')->exists($oldPath)) {
                    Storage::disk('public')->delete($oldPath);
                }
            }

            // Load the relationship for response
            $proofOfDelivery->load('order.orderDetail');

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => [
                    'id' => $proofOfDelivery->id,
                    'orderId' => $proofOfDelivery->order_id,
                    'orderShopId' => $proofOfDelivery->order_shop_id,
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

        } catch (\Throwable $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            // If image was uploaded but database save failed, delete the image
            if (isset($imagePath) && $imagePath) {
                $pathToDelete = str_replace('/storage/', '', $imagePath);
                if (Storage::disk('public')->exists($pathToDelete)) {
                    Storage::disk('public')->delete($pathToDelete);
                }
            }

            if ($e instanceof ValidationException || $e instanceof AuthorizationException) {
                throw $e;
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
    public function getByOrder(Request $request, $orderId)
    {
        $order = Order::with('orderShops')->find($orderId);

        if (! $order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }

        if ($response = $this->forbidUnlessOrderAccess($request, $order)) {
            return $response;
        }

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
                    'orderShopId' => $pod->order_shop_id,
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
    public function getByRider(Request $request, $riderId)
    {
        if ($response = $this->ensureSelfOrStaffOrSameRider($request, $riderId)) {
            return $response;
        }

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
                    'orderShopId' => $pod->order_shop_id,
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
    public function show(Request $request, $id)
    {
        $proofOfDelivery = ProofOfDelivery::with(['order.orderDetail', 'order.orderShops'])->find($id);

        if (!$proofOfDelivery) {
            return response()->json([
                'success' => false,
                'message' => 'Proof of delivery not found'
            ], 404);
        }

        if ($proofOfDelivery->order && ($response = $this->forbidUnlessOrderAccess($request, $proofOfDelivery->order))) {
            return $response;
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $proofOfDelivery->id,
                'orderId' => $proofOfDelivery->order_id,
                'orderShopId' => $proofOfDelivery->order_shop_id,
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
        $proofOfDelivery = ProofOfDelivery::with(['order.orderShops', 'orderShop.status'])->find($id);

        if (!$proofOfDelivery) {
            return response()->json([
                'success' => false,
                'message' => 'Proof of delivery not found'
            ], 404);
        }

        if ($proofOfDelivery->order && ($response = $this->forbidUnlessOrderAccess($request, $proofOfDelivery->order))) {
            return $response;
        }

        if ($response = $this->ensureRiderOrStaff($request)) {
            return $response;
        }

        if (! $this->isStaff($request->user())
            && (! $proofOfDelivery->orderShop
                || (int) $proofOfDelivery->orderShop->rider_id !== $this->authUserId($request))
        ) {
            return response()->json([
                'success' => false,
                'message' => 'You are not assigned to this proof of delivery.',
            ], 403);
        }

        if ($proofOfDelivery->orderShop
            && strcasecmp((string) $proofOfDelivery->orderShop->status?->stat_description, 'Delivered') === 0
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Proof for a delivered order is immutable and cannot be edited.',
            ], 422);
        }

        if ($request->has('status')) {
            return response()->json([
                'success' => false,
                'message' => 'Use POST /api/pod/upload to record a delivered or failed attempt.',
                'errors' => ['status' => ['POD status cannot be changed through this endpoint.']],
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'remarks' => 'nullable|string|max:1000',
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
                    'orderShopId' => $proofOfDelivery->order_shop_id,
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
    public function destroy(Request $request, $id)
    {
        $proofOfDelivery = ProofOfDelivery::with(['order.orderShops', 'orderShop.status'])->find($id);

        if (!$proofOfDelivery) {
            return response()->json([
                'success' => false,
                'message' => 'Proof of delivery not found'
            ], 404);
        }

        if ($proofOfDelivery->order && ($response = $this->forbidUnlessOrderAccess($request, $proofOfDelivery->order))) {
            return $response;
        }

        if ($response = $this->ensureRiderOrStaff($request)) {
            return $response;
        }

        if ($proofOfDelivery->orderShop
            && strcasecmp((string) $proofOfDelivery->orderShop->status?->stat_description, 'Delivered') === 0
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Proof for a delivered order is part of the audit trail and cannot be deleted.',
            ], 422);
        }

        if (! $this->isStaff($request->user())
            && (! $proofOfDelivery->orderShop
                || (int) $proofOfDelivery->orderShop->rider_id !== $this->authUserId($request))
        ) {
            return response()->json([
                'success' => false,
                'message' => 'You are not assigned to this proof of delivery.',
            ], 403);
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
