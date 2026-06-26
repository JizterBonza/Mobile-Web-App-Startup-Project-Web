<?php

namespace Tests\Unit;

use App\Models\DeliveryRevenueSetting;
use App\Models\Shop;
use App\Models\User;
use App\Services\DeliveryFeeService;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Tests\TestCase;

class DeliveryFeeServiceTest extends TestCase
{
    private function settings(array $overrides = []): DeliveryRevenueSetting
    {
        return new DeliveryRevenueSetting(array_merge([
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
            'inter_store_radius_km' => 10.000,
            'multi_store_promo_months' => 3,
            'multi_store_fee_per_extra_store' => 25.00,
            'multi_store_third_store_fee' => 49.00,
            'mov_first_store' => 300.00,
            'mov_first_store_penalty_fee' => 25.00,
            'mov_consecutive_store' => 200.00,
            'mov_penalty_base_fee' => 49.00,
            'mov_consecutive_store_met_fee' => 15.00,
            'pickup_delivery_method_id' => 3,
        ], $overrides));
    }

    private function shop(int $id, ?int $zoneId = 1, float $lat = 14.5995, float $lon = 120.9842): Shop
    {
        return new Shop([
            'id' => $id,
            'shop_name' => 'Shop '.$id,
            'zone_id' => $zoneId,
            'shop_lat' => $lat,
            'shop_long' => $lon,
        ]);
    }

    public function test_reduced_base_for_single_item_under_25kg(): void
    {
        $service = new DeliveryFeeService();
        $result = $service->calculate(
            $this->settings(),
            [
                ['quantity' => 1, 'unit_price' => 400.00, 'weight_kg' => 10.0, 'shop_id' => 1],
            ],
            Collection::make([1 => $this->shop(1)]),
            1,
            null,
        );

        $this->assertTrue($result['success']);
        $this->assertSame(15.0, $result['delivery_base_fee']);
        $this->assertTrue($result['is_reduced_base']);
        $this->assertSame(0.0, $result['delivery_km_fee']);
    }

    public function test_first_store_below_300_applies_25_penalty_instead_of_blocking(): void
    {
        $service = new DeliveryFeeService();
        $result = $service->calculate(
            $this->settings(),
            [
                ['quantity' => 1, 'unit_price' => 250.00, 'weight_kg' => 10.0, 'shop_id' => 1],
            ],
            Collection::make([1 => $this->shop(1)]),
            1,
            null,
        );

        $this->assertTrue($result['success']);
        $this->assertSame(25.0, $result['mov_penalty_fee']);
    }

    public function test_first_store_at_300_or_more_has_no_mov_fee(): void
    {
        $service = new DeliveryFeeService();
        $result = $service->calculate(
            $this->settings(),
            [
                ['quantity' => 1, 'unit_price' => 350.00, 'weight_kg' => 10.0, 'shop_id' => 1],
            ],
            Collection::make([1 => $this->shop(1)]),
            1,
            null,
        );

        $this->assertTrue($result['success']);
        $this->assertSame(0.0, $result['mov_penalty_fee']);
    }

    public function test_additional_store_below_200_charges_15_each(): void
    {
        $service = new DeliveryFeeService();
        $result = $service->calculate(
            $this->settings(),
            [
                ['quantity' => 1, 'unit_price' => 350.00, 'weight_kg' => 5.0, 'shop_id' => 1],
                ['quantity' => 1, 'unit_price' => 150.00, 'weight_kg' => 5.0, 'shop_id' => 2],
            ],
            Collection::make([
                1 => $this->shop(1),
                2 => $this->shop(2),
            ]),
            1,
            null,
        );

        $this->assertTrue($result['success']);
        $this->assertSame(15.0, $result['mov_penalty_fee']);
    }

    public function test_additional_store_at_200_or_more_is_free(): void
    {
        $service = new DeliveryFeeService();
        $result = $service->calculate(
            $this->settings(),
            [
                ['quantity' => 1, 'unit_price' => 350.00, 'weight_kg' => 5.0, 'shop_id' => 1],
                ['quantity' => 1, 'unit_price' => 220.00, 'weight_kg' => 5.0, 'shop_id' => 2],
            ],
            Collection::make([
                1 => $this->shop(1),
                2 => $this->shop(2),
            ]),
            1,
            null,
        );

        $this->assertTrue($result['success']);
        $this->assertSame(0.0, $result['mov_penalty_fee']);
    }

    public function test_heavy_surcharge_for_mixed_cart_over_25kg(): void
    {
        $service = new DeliveryFeeService();
        $result = $service->calculate(
            $this->settings(),
            [
                ['quantity' => 1, 'unit_price' => 400.00, 'weight_kg' => 20.0, 'shop_id' => 1],
                ['quantity' => 1, 'unit_price' => 150.00, 'weight_kg' => 15.0, 'shop_id' => 1],
            ],
            Collection::make([1 => $this->shop(1)]),
            1,
            null,
        );

        $this->assertTrue($result['success']);
        $this->assertSame(25.0, $result['heavy_surcharge']);
        $this->assertSame(1, $result['heavy_surcharge_units']);
    }

    public function test_pickup_waives_delivery_fees(): void
    {
        $service = new DeliveryFeeService();
        $result = $service->calculate(
            $this->settings(),
            [
                ['quantity' => 1, 'unit_price' => 400.00, 'weight_kg' => 10.0, 'shop_id' => 1],
            ],
            Collection::make([1 => $this->shop(1)]),
            3,
            null,
        );

        $this->assertTrue($result['success']);
        $this->assertTrue($result['is_pickup']);
        $this->assertSame(0.0, $result['delivery_base_fee']);
        $this->assertSame(0.0, $result['delivery_km_fee']);
        $this->assertSame(0.0, $result['mov_penalty_fee']);
    }

    public function test_multi_store_fee_after_promo_period(): void
    {
        $service = new DeliveryFeeService();
        $user = new User(['created_at' => Carbon::now()->subMonths(5)]);

        $result = $service->calculate(
            $this->settings(),
            [
                ['quantity' => 1, 'unit_price' => 400.00, 'weight_kg' => 5.0, 'shop_id' => 1],
                ['quantity' => 1, 'unit_price' => 250.00, 'weight_kg' => 5.0, 'shop_id' => 2],
            ],
            Collection::make([
                1 => $this->shop(1),
                2 => $this->shop(2, 1, 14.5995, 120.9842),
            ]),
            1,
            $user,
        );

        $this->assertTrue($result['success']);
        $this->assertSame(25.0, $result['multi_store_fee']);
    }

    public function test_km_fee_uses_store_to_store_route_not_customer_address(): void
    {
        $service = new DeliveryFeeService();

        $result = $service->calculate(
            $this->settings(['inter_store_radius_km' => 10.000]),
            [
                ['quantity' => 1, 'unit_price' => 400.00, 'weight_kg' => 5.0, 'shop_id' => 1],
                ['quantity' => 1, 'unit_price' => 250.00, 'weight_kg' => 5.0, 'shop_id' => 2],
            ],
            Collection::make([
                1 => $this->shop(1, 1, 14.5995, 120.9842),
                2 => $this->shop(2, 1, 14.6490, 120.9842),
            ]),
            1,
            null,
        );

        $this->assertTrue($result['success']);
        $this->assertGreaterThan(3.0, $result['delivery_distance_km']);
        $this->assertGreaterThan(0.0, $result['delivery_km_fee']);
    }
}
