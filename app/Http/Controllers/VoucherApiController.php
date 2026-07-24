<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Services\VoucherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VoucherApiController extends Controller
{
    use EnsuresApiOwnership;

    public function __construct(protected VoucherService $voucherService)
    {
    }

    /**
     * Validate a voucher code and preview the discount for checkout.
     */
    public function validateCode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'voucher_code' => 'required|string|max:50',
            'subtotal' => 'required|numeric|min:0',
            'shipping_fee' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            // Optional: if sent, must match the authenticated user.
            'user_id' => 'sometimes|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        if ($response = $this->rejectUserIdMismatch($request, $request->input('user_id'))) {
            return $response;
        }

        $data = $validator->validated();
        $userId = $this->authUserId($request);
        $subtotal = round((float) $data['subtotal'], 2);
        $shippingFee = round((float) ($data['shipping_fee'] ?? 0), 2);
        $totalAmount = array_key_exists('total_amount', $data) && $data['total_amount'] !== null
            ? round((float) $data['total_amount'], 2)
            : round($subtotal + $shippingFee, 2);

        $result = $this->voucherService->apply(
            $data['voucher_code'],
            $userId,
            $subtotal,
            [
                'subtotal' => $subtotal,
                'shipping_fee' => $shippingFee,
                'total_amount' => $totalAmount,
            ],
        );

        if ($result['success'] !== true) {
            return response()->json([
                'success' => false,
                'message' => $result['message'] ?? 'Unable to apply voucher.',
            ], 422);
        }

        $voucher = $result['voucher'];

        return response()->json([
            'success' => true,
            'message' => 'Voucher is valid',
            'data' => [
                'voucher_id' => $result['voucher_id'],
                'voucher_code' => $result['voucher_code'],
                'voucher_discount_amount' => $result['voucher_discount_amount'],
                'shipping_fee' => $result['shipping_fee'],
                'total_amount' => $result['total_amount'],
                'voucher' => $voucher ? [
                    'id' => $voucher->id,
                    'code' => $voucher->code,
                    'name' => $voucher->name,
                    'description' => $voucher->description,
                    'type' => $voucher->type,
                    'discount_value' => $voucher->discount_value,
                    'minimum_order_amount' => $voucher->minimum_order_amount,
                    'maximum_discount' => $voucher->maximum_discount,
                ] : null,
            ],
        ]);
    }
}
