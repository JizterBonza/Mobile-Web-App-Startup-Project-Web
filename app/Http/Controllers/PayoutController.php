<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Models\Shop;
use App\Services\PayoutInstructionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayoutController extends Controller
{
    use EnsuresApiOwnership;

    public function __construct(protected PayoutInstructionService $payouts)
    {
    }

    /**
     * One-way PayMongo disbursement feed. Records a payout and clears each
     * shop wallet for the amounts returned.
     */
    public function index(Request $request): JsonResponse
    {
        if (! $this->isPayoutAutomation($request) && ! $this->isStaff($request->user())) {
            if ($response = $this->ensureStaffOrVendor($request)) {
                return $response;
            }

            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to run disbursement.',
            ], 403);
        }

        $shopIds = null;

        if ($request->filled('shop_id')) {
            $shop = Shop::find($request->integer('shop_id'));
            if (! $shop) {
                return response()->json([
                    'success' => false,
                    'message' => 'Shop not found.',
                ], 404);
            }

            $shopIds = [(int) $shop->id];
        }

        $result = $this->payouts->disbursements($shopIds);

        return response()->json([
            'success' => true,
            'data' => $result['ready'],
            'skipped' => $result['skipped'],
            'count' => count($result['ready']),
        ]);
    }
}
