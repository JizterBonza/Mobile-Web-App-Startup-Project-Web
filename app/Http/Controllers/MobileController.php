<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DeliveryMethod;
use App\Models\OrderStatus;

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
}
