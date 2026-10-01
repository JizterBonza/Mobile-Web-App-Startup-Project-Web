<?php

namespace App\Services;

use App\Models\Shop;

class ShopZoneCoverageService
{
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
