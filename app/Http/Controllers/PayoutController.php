<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\EnsuresApiOwnership;
use App\Models\Payout;
use App\Models\Shop;
use App\Services\PayoutInstructionService;
use App\Services\PayoutStatusService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class PayoutController extends Controller
{
    use EnsuresApiOwnership;

    public function __construct(
        protected PayoutInstructionService $payouts,
        protected PayoutStatusService $statuses,
    ) {
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

    /**
     * Mark pending payouts as success or failed after the bank/PayMongo result.
     * Failed payouts credit the shop wallet back.
     */
    public function updateStatus(Request $request): JsonResponse
    {
        if (! $this->isPayoutAutomation($request) && ! $this->isStaff($request->user())) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to update payout status.',
            ], 403);
        }

        $updates = $this->statusUpdatesFromRequest($request);
        if ($updates === []) {
            return response()->json([
                'success' => false,
                'message' => 'Provide reference_number and status, or an updates array.',
            ], 422);
        }

        $data = [];
        $errors = [];

        foreach ($updates as $index => $update) {
            if (! is_array($update)) {
                $errors[] = [
                    'index' => $index,
                    'reference_number' => null,
                    'message' => 'Each update must include reference_number and status.',
                ];
                continue;
            }

            $reference = trim((string) ($update['reference_number'] ?? ''));
            $status = (string) ($update['status'] ?? '');
            $reason = isset($update['reason']) ? (string) $update['reason'] : null;

            if ($reference === '' || $status === '') {
                $errors[] = [
                    'index' => $index,
                    'reference_number' => $reference !== '' ? $reference : null,
                    'message' => 'reference_number and status are required.',
                ];
                continue;
            }

            $payout = Payout::query()->where('reference_number', $reference)->first();
            if (! $payout) {
                $errors[] = [
                    'index' => $index,
                    'reference_number' => $reference,
                    'message' => 'Payout not found.',
                ];
                continue;
            }

            try {
                $result = $this->statuses->apply($payout, $status, $reason);
            } catch (InvalidArgumentException $e) {
                $errors[] = [
                    'index' => $index,
                    'reference_number' => $reference,
                    'message' => $e->getMessage(),
                ];
                continue;
            }

            $updated = $result['payout'];
            $data[] = [
                'id' => $updated->id,
                'reference_number' => $updated->reference_number,
                'shop_id' => $updated->shop_id,
                'amount' => $updated->amount,
                'previous_status' => $result['previous_status'],
                'status' => $updated->status,
                'changed' => $result['changed'],
            ];
        }

        $httpStatus = $data === [] && $errors !== [] ? 422 : 200;

        return response()->json([
            'success' => $errors === [],
            'data' => $data,
            'errors' => $errors,
            'count' => count($data),
        ], $httpStatus);
    }

    /**
     * @return list<array{reference_number?: mixed, status?: mixed, reason?: mixed}>
     */
    private function statusUpdatesFromRequest(Request $request): array
    {
        if ($request->exists('updates')) {
            $updates = $request->input('updates');
            if (! is_array($updates)) {
                throw ValidationException::withMessages([
                    'updates' => 'updates must be an array of payout status changes.',
                ]);
            }

            return array_values($updates);
        }

        if ($request->filled('reference_number') || $request->filled('status')) {
            return [[
                'reference_number' => $request->input('reference_number'),
                'status' => $request->input('status'),
                'reason' => $request->input('reason'),
            ]];
        }

        return [];
    }
}
