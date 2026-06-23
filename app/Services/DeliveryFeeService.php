<?php

namespace App\Services;

use App\Models\DeliveryRevenueSetting;
use App\Models\Shop;
use App\Models\User;
use App\Support\GeoDistance;
use App\Support\WeightConverter;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class DeliveryFeeService
{
    /**
     * @param  array<int, array{quantity: int, unit_price: float, weight_kg: float, shop_id: int}>  $lineItems
     * @param  Collection<int, Shop>  $shops
     */
    public function calculate(
        DeliveryRevenueSetting $settings,
        array $lineItems,
        Collection $shops,
        int $deliveryMethodId,
        ?User $user = null,
    ): array {
        $lineCount = count($lineItems);
        $subtotal = 0.0;
        $totalWeightKg = 0.0;
        $shopSubtotals = [];
        $shopOrder = [];

        foreach ($lineItems as $line) {
            $qty = (int) $line['quantity'];
            $unitPrice = (float) $line['unit_price'];
            $lineSubtotal = $unitPrice * $qty;
            $subtotal += $lineSubtotal;
            $totalWeightKg += (float) ($line['weight_kg'] ?? 0);

            $shopId = (int) $line['shop_id'];
            if (! in_array($shopId, $shopOrder, true)) {
                $shopOrder[] = $shopId;
            }
            $shopSubtotals[$shopId] = ($shopSubtotals[$shopId] ?? 0) + $lineSubtotal;
        }

        $storeCount = count($shopOrder);
        $isPickup = $deliveryMethodId === (int) $settings->pickup_delivery_method_id;

        $multiStoreError = $this->validateMultiStore($settings, $storeCount, $shopOrder, $shops);
        if ($multiStoreError !== null) {
            return $this->errorResult($multiStoreError);
        }

        $deliveryDistanceKm = null;
        $deliveryBaseFee = 0.0;
        $deliveryKmFee = 0.0;
        $isReducedBase = false;

        if (! $isPickup) {
            $deliveryDistanceKm = $this->calculateInterStoreRouteDistanceKm($shopOrder, $shops);

            [$deliveryBaseFee, $isReducedBase] = $this->calculateDeliveryBase(
                $settings,
                $lineCount,
                $totalWeightKg,
            );

            $deliveryKmFee = $this->calculateKmFee($settings, $deliveryDistanceKm);
        }

        $heavyResult = $this->calculateHeavySurcharge($settings, $totalWeightKg, $lineCount);
        $multiStoreFee = $this->calculateMultiStoreFee($settings, $storeCount, $user);
        $movPenaltyFee = $isPickup
            ? 0.0
            : $this->calculateMovPenalty($settings, $shopOrder, $shopSubtotals);

        $shippingFee = round($deliveryBaseFee + $deliveryKmFee, 2);
        $totalFees = round(
            $deliveryBaseFee + $deliveryKmFee + $heavyResult['amount'] + $multiStoreFee + $movPenaltyFee,
            2,
        );

        $perStore = [];
        foreach ($shopOrder as $index => $shopId) {
            $shop = $shops->get($shopId);
            $perStore[] = [
                'shop_id' => $shopId,
                'shop_name' => $shop?->shop_name,
                'subtotal' => round($shopSubtotals[$shopId] ?? 0, 2),
                'is_first_store' => $index === 0,
            ];
        }

        return [
            'success' => true,
            'subtotal' => round($subtotal, 2),
            'delivery_base_fee' => round($deliveryBaseFee, 2),
            'delivery_km_fee' => round($deliveryKmFee, 2),
            'delivery_distance_km' => $deliveryDistanceKm !== null ? round($deliveryDistanceKm, 3) : null,
            'is_reduced_base' => $isReducedBase,
            'shipping_fee' => $shippingFee,
            'heavy_surcharge' => round($heavyResult['amount'], 2),
            'heavy_surcharge_units' => $heavyResult['units'],
            'total_weight_kg' => round($totalWeightKg, 3),
            'multi_store_fee' => round($multiStoreFee, 2),
            'mov_penalty_fee' => round($movPenaltyFee, 2),
            'total_fees' => $totalFees,
            'total_amount' => round($subtotal + $totalFees, 2),
            'store_count' => $storeCount,
            'is_pickup' => $isPickup,
            'per_store' => $perStore,
        ];
    }

    /**
     * Build line items from cart/order payload entries and loaded Item models.
     *
     * @param  array<int, array{item_id: int, quantity: int, shop_id: int, price_at_purchase?: float}>  $entries
     * @param  Collection<int, \App\Models\Item>  $items
     * @return array<int, array{quantity: int, unit_price: float, weight_kg: float, shop_id: int}>
     */
    public function buildLineItems(array $entries, Collection $items): array
    {
        $lines = [];

        foreach ($entries as $entry) {
            $itemModel = $items->get($entry['item_id']);
            $quantity = (int) $entry['quantity'];
            $unitPrice = $itemModel
                ? (float) $itemModel->getEffectivePrice()
                : (float) ($entry['price_at_purchase'] ?? 0);

            $weightKg = 0.0;
            if ($itemModel && $itemModel->weight !== null) {
                $weightKg = WeightConverter::toKg((float) $itemModel->weight, $itemModel->metric) * $quantity;
            }

            $lines[] = [
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'weight_kg' => $weightKg,
                'shop_id' => (int) $entry['shop_id'],
            ];
        }

        return $lines;
    }

    public function resolveSettings(): DeliveryRevenueSetting
    {
        $active = DeliveryRevenueSetting::getActive();

        if ($active) {
            return $active;
        }

        Log::warning('No active delivery_revenue_settings row found; using unsaved defaults from model attributes.');

        return new DeliveryRevenueSetting([
            'reduced_base_fee' => 15.00,
            'standard_base_fee' => 49.00,
            'reduced_base_weight_threshold_kg' => 25.000,
            'included_km' => 3.000,
            'km_rate' => 10.00,
            'weight_free_tier_kg' => 25.000,
            'weight_block_kg' => 25.000,
            'heavy_tier1_max_units' => 5,
            'heavy_tier1_fee' => 25.00,
            'heavy_tier2_max_units' => 10,
            'heavy_tier2_fee' => 15.00,
            'heavy_tier3_fee' => 10.00,
            'single_item_heavy_exempt_tolerance_kg' => 1.000,
            'max_stores_per_order' => 3,
            'inter_store_radius_km' => 2.000,
            'multi_store_promo_months' => 3,
            'multi_store_fee_per_extra_store' => 25.00,
            'multi_store_third_store_fee' => 49.00,
            'mov_first_store' => 300.00,
            'mov_first_store_penalty_fee' => 25.00,
            'mov_consecutive_store' => 200.00,
            'mov_penalty_base_fee' => 49.00,
            'mov_consecutive_store_met_fee' => 15.00,
            'pickup_delivery_method_id' => 3,
            'status' => DeliveryRevenueSetting::STATUS_ACTIVE,
        ]);
    }

    /**
     * @param  array<int, int>  $shopOrder
     * @param  Collection<int, Shop>  $shops
     */
    private function validateMultiStore(
        DeliveryRevenueSetting $settings,
        int $storeCount,
        array $shopOrder,
        Collection $shops,
    ): ?string {
        if ($storeCount <= 1) {
            return null;
        }

        if ($storeCount > (int) $settings->max_stores_per_order) {
            return 'This order exceeds the maximum of '.$settings->max_stores_per_order.' stores per order.';
        }

        $firstShop = $shops->get($shopOrder[0]);
        if (! $firstShop) {
            return 'First store could not be resolved for multi-store validation.';
        }

        $firstZoneId = $firstShop->zone_id;
        $firstLat = $firstShop->shop_lat !== null ? (float) $firstShop->shop_lat : null;
        $firstLon = $firstShop->shop_long !== null ? (float) $firstShop->shop_long : null;
        $maxRadius = (float) $settings->inter_store_radius_km;

        for ($i = 1; $i < count($shopOrder); $i++) {
            $shop = $shops->get($shopOrder[$i]);
            if (! $shop) {
                return 'Store #'.$shopOrder[$i].' could not be found.';
            }

            $sameZone = $firstZoneId !== null
                && $shop->zone_id !== null
                && (int) $firstZoneId === (int) $shop->zone_id;

            if ($sameZone) {
                continue;
            }

            $distance = GeoDistance::kmBetween(
                $firstLat,
                $firstLon,
                $shop->shop_lat !== null ? (float) $shop->shop_lat : null,
                $shop->shop_long !== null ? (float) $shop->shop_long : null,
            );

            if ($distance === null || $distance > $maxRadius) {
                return 'All stores must be in the same zone or within '.$maxRadius.' km of the first store.';
            }
        }

        return null;
    }

    /**
     * Sum consecutive store-to-store legs: store 1 → store 2 → store 3 → …
     *
     * @param  array<int, int>  $shopOrder
     * @param  Collection<int, Shop>  $shops
     */
    private function calculateInterStoreRouteDistanceKm(array $shopOrder, Collection $shops): ?float
    {
        if (count($shopOrder) <= 1) {
            return 0.0;
        }

        $totalKm = 0.0;

        for ($i = 0; $i < count($shopOrder) - 1; $i++) {
            $fromShop = $shops->get($shopOrder[$i]);
            $toShop = $shops->get($shopOrder[$i + 1]);

            if (! $fromShop || ! $toShop) {
                return null;
            }

            $legKm = GeoDistance::kmBetween(
                $fromShop->shop_lat !== null ? (float) $fromShop->shop_lat : null,
                $fromShop->shop_long !== null ? (float) $fromShop->shop_long : null,
                $toShop->shop_lat !== null ? (float) $toShop->shop_lat : null,
                $toShop->shop_long !== null ? (float) $toShop->shop_long : null,
            );

            if ($legKm === null) {
                return null;
            }

            $totalKm += $legKm;
        }

        return $totalKm;
    }

    /** @return array{0: float, 1: bool} */
    private function calculateDeliveryBase(
        DeliveryRevenueSetting $settings,
        int $lineCount,
        float $totalWeightKg,
    ): array {
        $threshold = (float) $settings->reduced_base_weight_threshold_kg;

        if ($lineCount === 1 && $totalWeightKg < $threshold) {
            return [(float) $settings->reduced_base_fee, true];
        }

        return [(float) $settings->standard_base_fee, false];
    }

    private function calculateKmFee(DeliveryRevenueSetting $settings, ?float $distanceKm): float
    {
        if ($distanceKm === null) {
            return 0.0;
        }

        $included = (float) $settings->included_km;
        if ($distanceKm <= $included) {
            return 0.0;
        }

        $extraKm = (int) ceil($distanceKm - $included);

        return $extraKm * (float) $settings->km_rate;
    }

    /** @return array{amount: float, units: int} */
    private function calculateHeavySurcharge(
        DeliveryRevenueSetting $settings,
        float $totalWeightKg,
        int $lineCount,
    ): array {
        $freeTier = (float) $settings->weight_free_tier_kg;
        $blockKg = max((float) $settings->weight_block_kg, 0.0001);
        $tolerance = (float) $settings->single_item_heavy_exempt_tolerance_kg;

        if ($lineCount === 1 && abs($totalWeightKg - $freeTier) <= $tolerance) {
            return ['amount' => 0.0, 'units' => 0];
        }

        if ($totalWeightKg <= $freeTier) {
            return ['amount' => 0.0, 'units' => 0];
        }

        $units = (int) ceil(($totalWeightKg - $freeTier) / $blockKg);
        $amount = 0.0;

        for ($u = 1; $u <= $units; $u++) {
            if ($u <= (int) $settings->heavy_tier1_max_units) {
                $amount += (float) $settings->heavy_tier1_fee;
            } elseif ($u <= (int) $settings->heavy_tier2_max_units) {
                $amount += (float) $settings->heavy_tier2_fee;
            } else {
                $amount += (float) $settings->heavy_tier3_fee;
            }
        }

        return ['amount' => $amount, 'units' => $units];
    }

    private function calculateMultiStoreFee(
        DeliveryRevenueSetting $settings,
        int $storeCount,
        ?User $user,
    ): float {
        if ($storeCount <= 1) {
            return 0.0;
        }

        $monthsSinceSignup = $this->monthsSinceSignup($user);
        $inPromo = $monthsSinceSignup <= (int) $settings->multi_store_promo_months;

        if ($inPromo) {
            return $storeCount >= 3 ? (float) $settings->multi_store_third_store_fee : 0.0;
        }

        $fee = 0.0;
        if ($storeCount >= 2) {
            $fee += (float) $settings->multi_store_fee_per_extra_store;
        }
        if ($storeCount >= 3) {
            $fee += (float) $settings->multi_store_third_store_fee;
        }

        return $fee;
    }

    /**
     * @param  array<int, int>  $shopOrder
     * @param  array<int, float>  $shopSubtotals
     */
    private function calculateMovPenalty(
        DeliveryRevenueSetting $settings,
        array $shopOrder,
        array $shopSubtotals,
    ): float {
        if (empty($shopOrder)) {
            return 0.0;
        }

        $penalty = 0.0;

        $firstSubtotal = $shopSubtotals[$shopOrder[0]] ?? 0.0;
        if ($firstSubtotal + 0.009 < (float) $settings->mov_first_store) {
            $penalty += (float) $settings->mov_first_store_penalty_fee;
        }

        for ($i = 1; $i < count($shopOrder); $i++) {
            $subtotal = $shopSubtotals[$shopOrder[$i]] ?? 0.0;
            if ($subtotal + 0.009 < (float) $settings->mov_consecutive_store) {
                $penalty += (float) $settings->mov_consecutive_store_met_fee;
            }
        }

        return $penalty;
    }

    private function monthsSinceSignup(?User $user): int
    {
        if (! $user || ! $user->created_at) {
            return PHP_INT_MAX;
        }

        return (int) $user->created_at->diffInMonths(now()) + 1;
    }

    private function errorResult(string $message): array
    {
        return [
            'success' => false,
            'message' => $message,
        ];
    }
}
