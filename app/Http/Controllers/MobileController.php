<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DeliveryMethod;

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
}
