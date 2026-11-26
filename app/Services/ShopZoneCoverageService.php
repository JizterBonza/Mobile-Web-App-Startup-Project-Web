<?php

namespace App\Services;

use App\Models\Shop;
use App\Models\Zone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ShopZoneCoverageService
{
    /**
     * Active zones that contain the point. A zone with a district must also sit inside that district.
     * A zone with no district qualifies on its own boundary.
     *
     * @return array<int, int>
     */
    public function zoneIdsContainingPoint(float $lat, float $lng): array
    {
        return Zone::query()
            ->with('district')
            ->where('status', true)
            ->get()
            ->filter(function (Zone $zone) use ($lat, $lng) {
                if (! $zone->containsPoint($lat, $lng)) {
                    return false;
                }

                $district = $zone->district;
                if ($district === null) {
                    return true;
                }

                return (bool) $district->status && $district->containsPoint($lat, $lng);
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * Matching zone ids for a customer location.
     * Missing coordinates yield an empty list. Invalid coordinates yield a 422 response.
     *
     * @return array<int, int>|JsonResponse
     */
    public function zoneIdsForRequest(Request $request): array|JsonResponse
    {
        $validator = Validator::make($request->only(['lat', 'long']), [
            'lat' => 'nullable|numeric|between:-90,90',
            'long' => 'nullable|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (! $request->filled('lat') || ! $request->filled('long')) {
            return [];
        }

        return $this->zoneIdsContainingPoint((float) $request->input('lat'), (float) $request->input('long'));
    }

    /**
     * Check delivery coordinates against each requested shop's assigned zone.
     *
     * @param  array<int, int>  $shopIds
     * @return array{all_inside_zone: bool, shops: array<int, array<string, mixed>>}
     */
    public function check(float $latitude, float $longitude, array $shopIds): array
    {
        $shopsById = Shop::query()
            ->with('zone')
            ->whereIn('id', $shopIds)
            ->get()
            ->keyBy('id');

        $results = [];

        foreach ($shopIds as $shopId) {
            $shop = $shopsById->get($shopId);
            $zone = $shop->zone;
            $insideZone = false;
            $reason = null;

            if ($zone === null) {
                $reason = 'shop_has_no_zone';
            } elseif (! $zone->status) {
                $reason = 'zone_inactive';
            } elseif (! $zone->hasValidBoundary()) {
                $reason = 'invalid_zone_boundary';
            } elseif (! $zone->containsPoint($latitude, $longitude)) {
                $reason = 'outside_zone';
            } else {
                $insideZone = true;
            }

            $results[] = [
                'shop_id' => (int) $shop->id,
                'shop_name' => $shop->shop_name,
                'zone_id' => $zone !== null ? (int) $zone->id : null,
                'zone_name' => $zone?->name,
                'inside_zone' => $insideZone,
                'reason' => $reason,
            ];
        }

        return [
            'all_inside_zone' => collect($results)->every(
                fn (array $result): bool => $result['inside_zone'],
            ),
            'shops' => $results,
        ];
    }
}
