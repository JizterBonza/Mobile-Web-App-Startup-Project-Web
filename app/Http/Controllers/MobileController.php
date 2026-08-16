<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\DeliveryMethod;
use App\Models\Notification;
use App\Models\OrderStatus;
use Illuminate\Http\Request;

class MobileController extends Controller
{
    /**
     * Get all active delivery methods.
     */
    public function getDeliveryMethods()
    {
        $deliveryMethods = DeliveryMethod::where('status', true)->get();

        return response()->json([
            'success' => true,
            'data' => $deliveryMethods,
        ]);
    }

    /**
     * Get all active order statuses.
     */
    public function getOrderStatuses()
    {
        $orderStatuses = OrderStatus::where('is_active', true)->get();

        return response()->json([
            'success' => true,
            'data' => $orderStatuses,
        ]);
    }

    /**
     * Badge counts for the authenticated user's app shell (cart + unread notifications).
     */
    public function badges(Request $request)
    {
        $userId = (int) $request->user()->id;

        return response()->json([
            'success' => true,
            'cart_count' => Cart::where('user_id', $userId)->where('status', 'active')->count(),
            'unread_notifications' => Notification::where('user_id', $userId)->where('read', false)->count(),
        ]);
    }
}
