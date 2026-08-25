<?php

namespace Tests\Feature;

use App\Models\OrderLog;
use App\Models\OrderShop;
use App\Models\User;
use App\Services\OrderStatusCustomerMessageService;
use App\Services\OrderStatusTransitionService;
use App\Services\ShopWalletService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderStatusHistoryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        $this->createSchema();
        $this->seedReferenceData();

        $this->mock(OrderStatusCustomerMessageService::class)
            ->shouldReceive('notifyForStatusId')
            ->zeroOrMoreTimes();
        $this->mock(ShopWalletService::class)
            ->shouldReceive('syncUncreditedSales')
            ->zeroOrMoreTimes();
    }

    public function test_rider_pickup_is_logged_per_shop_and_is_idempotent(): void
    {
        [$customer, $rider, $orderId, $orderShop] = $this->makeOrder(4);
        $service = app(OrderStatusTransitionService::class);

        $result = $service->transition($orderShop, 5, $rider, ['source' => 'test']);
        $again = $service->transition($orderShop->id, 5, $rider, ['source' => 'test']);

        $this->assertTrue($result['changed']);
        $this->assertFalse($again['changed']);
        $this->assertDatabaseHas('order_logs', [
            'order_id' => $orderId,
            'order_shop_id' => $orderShop->id,
            'event' => 'status_changed',
            'from_status' => 'Ready for Delivery',
            'to_status' => 'In-Transit',
            'user_id' => $rider->id,
        ]);
        $this->assertDatabaseCount('order_logs', 1);
        $this->assertDatabaseHas('proof_of_delivery', [
            'order_shop_id' => $orderShop->id,
            'status' => 'pending',
        ]);
    }

    public function test_delivery_requires_verified_proof(): void
    {
        [, $rider, , $orderShop] = $this->makeOrder(5);
        $service = app(OrderStatusTransitionService::class);

        try {
            $service->transition($orderShop, 6, $rider);
            $this->fail('Delivery without proof should be rejected.');
        } catch (ValidationException) {
            $this->assertSame(5, (int) $orderShop->fresh()->order_status);
        }

        $service->transition($orderShop, 6, $rider, [
            'proof_verified' => true,
            'metadata' => ['proof_of_delivery_id' => 99],
        ]);

        $this->assertDatabaseHas('order_logs', [
            'order_shop_id' => $orderShop->id,
            'from_status' => 'In-Transit',
            'to_status' => 'Delivered',
        ]);
    }

    public function test_customer_can_cancel_only_a_pending_order(): void
    {
        [$customer, , , $pendingLeg] = $this->makeOrder(1);
        $service = app(OrderStatusTransitionService::class);

        $service->transition($pendingLeg, 7, $customer, ['notes' => 'Changed my mind.']);
        $this->assertSame(7, (int) $pendingLeg->fresh()->order_status);

        [, , $preparingOrderId, $preparingLeg] = $this->makeOrder(2);
        DB::table('orders')->where('id', $preparingOrderId)->update(['user_id' => $customer->id]);
        $preparingLeg->unsetRelation('order');
        $this->expectException(AuthorizationException::class);
        $service->transition($preparingLeg, 7, $customer);
    }

    public function test_admin_override_requires_reason_and_is_marked(): void
    {
        [, , , $orderShop] = $this->makeOrder(6);
        $admin = $this->makeUser(User::TYPE_ADMIN);
        $service = app(OrderStatusTransitionService::class);

        try {
            $service->transition($orderShop, 2, $admin, ['force' => true]);
            $this->fail('An override without a reason should be rejected.');
        } catch (ValidationException) {
            $this->assertSame(6, (int) $orderShop->fresh()->order_status);
        }

        $service->transition($orderShop, 2, $admin, [
            'force' => true,
            'reason' => 'Correcting an operational mistake.',
        ]);

        $log = OrderLog::firstOrFail();
        $this->assertSame('admin_override', $log->event);
        $this->assertTrue($log->metadata['admin_override']);
    }

    public function test_history_endpoint_limits_a_rider_to_assigned_shop_legs(): void
    {
        [$customer, $rider, $orderId, $firstLeg] = $this->makeOrder(5);
        $otherRider = $this->makeUser(User::TYPE_RIDER);
        $secondShop = $this->makeShop('Second Shop');
        $secondLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $secondShop,
            'rider_id' => $otherRider->id,
            'order_status' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        OrderLog::create([
            'order_id' => $orderId,
            'order_shop_id' => $firstLeg->id,
            'event' => 'status_changed',
            'from_status' => 'Ready for Delivery',
            'to_status' => 'In-Transit',
            'user_id' => $rider->id,
            'metadata' => ['source' => 'test', 'ip_address' => 'must-not-leak'],
            'ip_address' => '127.0.0.1',
            'user_agent' => 'secret-agent',
        ]);
        OrderLog::create([
            'order_id' => $orderId,
            'order_shop_id' => $secondLegId,
            'event' => 'status_changed',
            'from_status' => 'Ready for Delivery',
            'to_status' => 'In-Transit',
            'user_id' => $otherRider->id,
        ]);

        Sanctum::actingAs($rider);
        $response = $this->getJson("/api/orders/{$orderId}/history");

        $response->assertOk()
            ->assertJsonCount(1, 'data.events')
            ->assertJsonPath('data.events.0.order_shop_id', $firstLeg->id)
            ->assertJsonMissing(['ip_address' => 'must-not-leak'])
            ->assertJsonMissing(['user_agent' => 'secret-agent']);
    }

    public function test_broad_order_update_rejects_status_changes(): void
    {
        [$customer, , $orderId] = $this->makeOrder(1);
        Sanctum::actingAs($customer);

        $this->putJson("/api/orders/{$orderId}", ['order_status' => 2])
            ->assertStatus(422)
            ->assertJsonValidationErrors('order_status');
    }

    public function test_ready_for_delivery_endpoint_groups_only_unassigned_ready_legs_by_order(): void
    {
        [, $rider, $orderId, $firstReadyLeg] = $this->makeOrder(4);
        $firstReadyLeg->update(['rider_id' => null]);

        $secondShopId = $this->makeShop('Second Ready Shop');
        $secondReadyLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $secondShopId,
            'rider_id' => null,
            'order_status' => 4,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $preparingShopId = $this->makeShop('Preparing Shop');
        $preparingLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $preparingShopId,
            'rider_id' => null,
            'order_status' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $assignedShopId = $this->makeShop('Assigned Shop');
        $assignedLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $assignedShopId,
            'rider_id' => $rider->id,
            'order_status' => 4,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([
            [$firstReadyLeg->shop_id, 2],
            [$secondShopId, 3],
            [$preparingShopId, 7],
            [$assignedShopId, 11],
        ] as [$shopId, $quantity]) {
            DB::table('order_items')->insert([
                'order_id' => $orderId,
                'shop_id' => $shopId,
                'item_id' => null,
                'quantity' => $quantity,
                'price_at_purchase' => 100,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $orderDetail = DB::table('order_details')
            ->where('id', DB::table('orders')->where('id', $orderId)->value('order_detail_id'))
            ->first();
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/orders/ready-for-delivery');

        $response->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('data.0.order_id', $orderId)
            ->assertJsonPath('data.0.order_code', $orderDetail->order_code)
            ->assertJsonPath('data.0.recipient_name', 'Chito Panilagan')
            ->assertJsonPath('data.0.delivery_address', 'Purok 8, San Isidro, Tagum City')
            ->assertJsonPath('data.0.pickup_store_count', 2)
            ->assertJsonPath('data.0.item_count', 5)
            ->assertJsonCount(2, 'data.0.available_order_shops')
            ->assertJsonStructure(['data' => [['ordered_at']]])
            ->assertJsonFragment(['order_shop_id' => $firstReadyLeg->id])
            ->assertJsonFragment(['order_shop_id' => $secondReadyLegId])
            ->assertJsonMissing(['order_shop_id' => $preparingLegId])
            ->assertJsonMissing(['order_shop_id' => $assignedLegId])
            ->assertJsonMissingPath('data.0.new');
    }

    public function test_ready_for_delivery_endpoint_returns_an_empty_card_list(): void
    {
        [, $rider] = $this->makeOrder(2);
        Sanctum::actingAs($rider);

        $this->getJson('/api/orders/ready-for-delivery')
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'data' => [],
                'count' => 0,
            ]);
    }

    public function test_ready_for_delivery_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/orders/ready-for-delivery')->assertUnauthorized();
    }

    public function test_ready_for_delivery_endpoint_allows_admins_and_super_admins(): void
    {
        [, , , $readyLeg] = $this->makeOrder(4);
        $readyLeg->update(['rider_id' => null]);

        foreach ([User::TYPE_ADMIN, User::TYPE_SUPER_ADMIN] as $userType) {
            Sanctum::actingAs($this->makeUser($userType));

            $this->getJson('/api/orders/ready-for-delivery')
                ->assertOk()
                ->assertJsonPath('count', 1);
        }
    }

    public function test_ready_for_delivery_endpoint_rejects_customers(): void
    {
        [$customer] = $this->makeOrder(4);
        Sanctum::actingAs($customer);

        $this->getJson('/api/orders/ready-for-delivery')->assertForbidden();
    }

    public function test_ready_for_delivery_endpoint_returns_only_the_first_image_per_item(): void
    {
        [, $rider, $orderId, $readyLeg] = $this->makeOrder(4);
        $readyLeg->update(['rider_id' => null]);
        $itemId = DB::table('items')->insertGetId([
            'shop_id' => $readyLeg->shop_id,
            'item_name' => 'Animal Feed',
            'item_price' => 350,
            'item_images' => json_encode([
                'items/feed-front.jpg',
                'items/feed-back.jpg',
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('order_items')->insert([
            'order_id' => $orderId,
            'shop_id' => $readyLeg->shop_id,
            'item_id' => $itemId,
            'quantity' => 1,
            'price_at_purchase' => 350,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Sanctum::actingAs($rider);

        $this->getJson('/api/orders/ready-for-delivery')
            ->assertOk()
            ->assertJsonPath(
                'data.0.available_order_shops.0.items.0.item.item_images',
                'items/feed-front.jpg'
            )
            ->assertJsonMissing(['item_images' => ['items/feed-front.jpg', 'items/feed-back.jpg']]);
    }

    public function test_active_deliveries_endpoint_returns_mobile_cards_for_the_authenticated_rider(): void
    {
        [, $rider, $orderId, $readyLeg] = $this->makeOrder(4);
        $orderDetailId = DB::table('orders')->where('id', $orderId)->value('order_detail_id');
        DB::table('order_details')
            ->where('id', $orderDetailId)
            ->update(['shipping_fee' => 80]);
        DB::table('addresses')
            ->where('id', DB::table('order_details')->where('id', $orderDetailId)->value('address_id'))
            ->update([
                'contact_number' => '09171234567',
                'latitude' => 7.4479123,
                'longitude' => 125.8071234,
            ]);
        $inTransitShopId = $this->makeShop('Second Active Pickup');
        $inTransitLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $inTransitShopId,
            'rider_id' => $rider->id,
            'order_status' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $deliveredShopId = $this->makeShop('Completed Pickup');
        $deliveredLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $deliveredShopId,
            'rider_id' => $rider->id,
            'order_status' => 6,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $otherRiderLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $this->makeShop('Other Rider Pickup'),
            'rider_id' => $this->makeUser(User::TYPE_RIDER)->id,
            'order_status' => 4,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([
            [$readyLeg->shop_id, 2],
            [$inTransitShopId, 5],
            [$deliveredShopId, 11],
        ] as [$shopId, $quantity]) {
            DB::table('order_items')->insert([
                'order_id' => $orderId,
                'shop_id' => $shopId,
                'item_id' => null,
                'quantity' => $quantity,
                'price_at_purchase' => 100,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        Sanctum::actingAs($rider);

        $response = $this->getJson('/api/rider/active-deliveries');

        $response->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('data.0.order_id', $orderId)
            ->assertJsonMissingPath('data.0.status')
            ->assertJsonMissingPath('data.0.status_label')
            ->assertJsonPath('data.0.recipient_name', 'Chito Panilagan')
            ->assertJsonPath('data.0.delivery_address', 'Purok 8, San Isidro, Tagum City')
            ->assertJsonPath('data.0.pickup_store_count', 2)
            ->assertJsonPath('data.0.item_count', 7)
            ->assertJsonCount(2, 'data.0.active_order_shops')
            ->assertJsonMissingPath('data.0.recipient_contact_number')
            ->assertJsonPath('data.0.drop_off_coordinates.latitude', 7.4479123)
            ->assertJsonPath('data.0.drop_off_coordinates.longitude', 125.8071234)
            ->assertJsonFragment(['order_shop_id' => $readyLeg->id])
            ->assertJsonFragment(['order_shop_id' => $inTransitLegId])
            ->assertJsonMissing(['order_shop_id' => $deliveredLegId])
            ->assertJsonMissing(['order_shop_id' => $otherRiderLegId])
            ->assertJsonMissingPath('data.0.rate')
            ->assertJsonMissingPath('data.0.currency');
    }

    public function test_rider_can_fetch_one_assigned_active_delivery(): void
    {
        [, $rider, $orderId, $readyLeg] = $this->makeOrder(4);
        $orderDetailId = DB::table('orders')->where('id', $orderId)->value('order_detail_id');
        DB::table('addresses')
            ->where('id', DB::table('order_details')->where('id', $orderDetailId)->value('address_id'))
            ->update([
                'contact_number' => ' 09171234567 ',
                'latitude' => 7.4479123,
                'longitude' => 125.8071234,
            ]);
        DB::table('delivery_method')->where('id', 1)->update(['description' => 'sTaNdArD']);
        $inTransitShopId = $this->makeShop('Second Active Pickup');
        $inTransitLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $inTransitShopId,
            'rider_id' => $rider->id,
            'order_status' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $otherRiderLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $this->makeShop('Other Rider Pickup'),
            'rider_id' => $this->makeUser(User::TYPE_RIDER)->id,
            'order_status' => 4,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        foreach ([[$readyLeg->shop_id, 2], [$inTransitShopId, 5]] as [$shopId, $quantity]) {
            DB::table('order_items')->insert([
                'order_id' => $orderId,
                'shop_id' => $shopId,
                'item_id' => null,
                'quantity' => $quantity,
                'price_at_purchase' => 100,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        Sanctum::actingAs($rider);

        $this->getJson("/api/rider/active-deliveries/{$orderId}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order_id', $orderId)
            ->assertJsonPath('data.recipient_contact_number', '09171234567')
            ->assertJsonPath('data.drop_off_coordinates.latitude', 7.4479123)
            ->assertJsonPath('data.drop_off_coordinates.longitude', 125.8071234)
            ->assertJsonPath('data.pickup_store_count', 2)
            ->assertJsonPath('data.item_count', 7)
            ->assertJsonCount(2, 'data.active_order_shops')
            ->assertJsonFragment(['order_shop_id' => $readyLeg->id])
            ->assertJsonFragment(['order_shop_id' => $inTransitLegId])
            ->assertJsonMissing(['order_shop_id' => $otherRiderLegId]);
    }

    public function test_specific_active_delivery_omits_contact_for_ineligible_delivery_methods_or_values(): void
    {
        foreach ([
            ['delivery_method_id' => 1, 'status_id' => 4, 'contact_number' => null, 'http_status' => 200],
            ['delivery_method_id' => 1, 'status_id' => 4, 'contact_number' => '', 'http_status' => 200],
            ['delivery_method_id' => 2, 'status_id' => 8, 'contact_number' => '09170000001', 'http_status' => 200],
            ['delivery_method_id' => 3, 'status_id' => 3, 'contact_number' => '09170000002', 'http_status' => 404],
        ] as $scenario) {
            [, $rider, $orderId] = $this->makeOrder($scenario['status_id']);
            $orderDetailId = DB::table('orders')->where('id', $orderId)->value('order_detail_id');
            $addressId = DB::table('order_details')->where('id', $orderDetailId)->value('address_id');
            DB::table('order_details')->where('id', $orderDetailId)->update([
                'delivery_method_id' => $scenario['delivery_method_id'],
            ]);
            DB::table('addresses')->where('id', $addressId)->update([
                'contact_number' => $scenario['contact_number'],
            ]);
            Sanctum::actingAs($rider);

            $response = $this->getJson("/api/rider/active-deliveries/{$orderId}")
                ->assertStatus($scenario['http_status'])
                ->assertJsonMissingPath('data.recipient_contact_number');

            if ($scenario['http_status'] === 200) {
                $response
                    ->assertJsonPath('data.drop_off_coordinates.latitude', null)
                    ->assertJsonPath('data.drop_off_coordinates.longitude', null);
            } else {
                $response->assertJsonMissingPath('data.drop_off_coordinates');
            }
        }
    }

    public function test_specific_active_delivery_is_rider_only_and_hides_unassigned_orders(): void
    {
        [, $assignedRider, $orderId] = $this->makeOrder(4);
        $orderDetailId = DB::table('orders')->where('id', $orderId)->value('order_detail_id');
        DB::table('addresses')
            ->where('id', DB::table('order_details')->where('id', $orderDetailId)->value('address_id'))
            ->update(['contact_number' => '09171234567']);

        $this->getJson("/api/rider/active-deliveries/{$orderId}")->assertUnauthorized();

        Sanctum::actingAs($this->makeUser(User::TYPE_CUSTOMER));
        $this->getJson("/api/rider/active-deliveries/{$orderId}")->assertForbidden();

        Sanctum::actingAs($this->makeUser(User::TYPE_RIDER));
        $this->getJson("/api/rider/active-deliveries/{$orderId}")
            ->assertNotFound()
            ->assertExactJson([
                'success' => false,
                'message' => 'Active delivery not found.',
            ]);

        DB::table('order_shops')
            ->where('order_id', $orderId)
            ->where('rider_id', $assignedRider->id)
            ->update(['order_status' => 6]);
        Sanctum::actingAs($assignedRider);
        $this->getJson("/api/rider/active-deliveries/{$orderId}")->assertNotFound();
    }

    public function test_active_deliveries_endpoint_requires_a_rider_and_returns_empty_data(): void
    {
        $this->getJson('/api/rider/active-deliveries')->assertUnauthorized();

        foreach ([User::TYPE_CUSTOMER, User::TYPE_ADMIN, User::TYPE_VENDOR] as $userType) {
            Sanctum::actingAs($this->makeUser($userType));
            $this->getJson('/api/rider/active-deliveries')->assertForbidden();
        }

        Sanctum::actingAs($this->makeUser(User::TYPE_RIDER));
        $this->getJson('/api/rider/active-deliveries')
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'data' => [],
                'count' => 0,
            ]);
    }

    public function test_rider_accepts_all_selected_ready_legs_atomically_and_idempotently(): void
    {
        [, $rider, $orderId, $firstReadyLeg] = $this->makeOrder(4);
        $firstReadyLeg->update(['rider_id' => null]);
        $secondReadyLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $this->makeShop('Second Pickup'),
            'rider_id' => null,
            'order_status' => 4,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $requestedIds = [$secondReadyLegId, $firstReadyLeg->id];
        $sortedIds = [$firstReadyLeg->id, $secondReadyLegId];
        Sanctum::actingAs($rider);

        $response = $this->postJson("/api/orders/{$orderId}/accept", [
            'order_shop_ids' => $requestedIds,
            'rider_id' => 999999,
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order_id', $orderId)
            ->assertJsonPath('data.rider_id', $rider->id)
            ->assertJsonPath('data.order_shop_ids', $sortedIds)
            ->assertJsonPath('data.newly_assigned_order_shop_ids', $sortedIds)
            ->assertJsonPath('data.already_assigned_order_shop_ids', []);

        foreach ($sortedIds as $orderShopId) {
            $this->assertDatabaseHas('order_shops', [
                'id' => $orderShopId,
                'rider_id' => $rider->id,
                'order_status' => 4,
            ]);
            $this->assertDatabaseHas('order_logs', [
                'order_shop_id' => $orderShopId,
                'event' => 'rider_assigned',
                'from_status' => 'Ready for Delivery',
                'to_status' => 'Ready for Delivery',
                'user_id' => $rider->id,
            ]);
        }

        $this->getJson('/api/orders/ready-for-delivery')
            ->assertOk()
            ->assertJsonPath('count', 0);
        $this->getJson("/api/orders/rider/{$rider->id}")
            ->assertOk()
            ->assertJsonPath('count', 2)
            ->assertJsonFragment(['order_shop_id' => $firstReadyLeg->id])
            ->assertJsonFragment(['order_shop_id' => $secondReadyLegId]);

        $this->postJson("/api/orders/{$orderId}/accept", [
            'order_shop_ids' => $requestedIds,
        ])->assertOk()
            ->assertJsonPath('data.newly_assigned_order_shop_ids', [])
            ->assertJsonPath('data.already_assigned_order_shop_ids', $sortedIds);
        $this->assertDatabaseCount('order_logs', 2);
    }

    public function test_rider_acceptance_rolls_back_when_any_selected_leg_is_unavailable(): void
    {
        [, $rider, $orderId, $claimedLeg] = $this->makeOrder(4);
        $otherRider = $this->makeUser(User::TYPE_RIDER);
        $claimedLeg->update(['rider_id' => $otherRider->id]);
        $availableLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $this->makeShop('Still Available'),
            'rider_id' => null,
            'order_status' => 4,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Sanctum::actingAs($rider);

        $this->postJson("/api/orders/{$orderId}/accept", [
            'order_shop_ids' => [$claimedLeg->id, $availableLegId],
        ])->assertConflict()
            ->assertJsonValidationErrors('order_shop_ids');

        $this->assertDatabaseHas('order_shops', [
            'id' => $availableLegId,
            'rider_id' => null,
        ]);
        $this->assertDatabaseCount('order_logs', 0);
    }

    public function test_rider_acceptance_rejects_non_ready_and_foreign_order_legs(): void
    {
        [, $rider, $orderId, $readyLeg] = $this->makeOrder(4);
        $readyLeg->update(['rider_id' => null]);
        $nonReadyLegId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $this->makeShop('Preparing Pickup'),
            'rider_id' => null,
            'order_status' => 2,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        [, , , $foreignLeg] = $this->makeOrder(4);
        $foreignLeg->update(['rider_id' => null]);
        Sanctum::actingAs($rider);

        $this->postJson("/api/orders/{$orderId}/accept", [
            'order_shop_ids' => [$readyLeg->id, $nonReadyLegId],
        ])->assertConflict();
        $this->assertNull($readyLeg->fresh()->rider_id);

        $this->postJson("/api/orders/{$orderId}/accept", [
            'order_shop_ids' => [$foreignLeg->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('order_shop_ids');
        $this->assertNull($foreignLeg->fresh()->rider_id);
    }

    public function test_rider_acceptance_validates_ids_order_and_actor(): void
    {
        [$customer, $rider, $orderId, $readyLeg] = $this->makeOrder(4);
        $readyLeg->update(['rider_id' => null]);

        $this->postJson("/api/orders/{$orderId}/accept", [
            'order_shop_ids' => [$readyLeg->id],
        ])->assertUnauthorized();

        foreach ([$customer, $this->makeUser(User::TYPE_ADMIN), $this->makeUser(User::TYPE_VENDOR)] as $actor) {
            Sanctum::actingAs($actor);
            $this->postJson("/api/orders/{$orderId}/accept", [
                'order_shop_ids' => [$readyLeg->id],
            ])->assertForbidden();
        }

        Sanctum::actingAs($rider);
        $this->postJson("/api/orders/{$orderId}/accept", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('order_shop_ids');
        $this->postJson("/api/orders/{$orderId}/accept", [
            'order_shop_ids' => [$readyLeg->id, $readyLeg->id],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('order_shop_ids.1');
        $this->postJson('/api/orders/999999/accept', [
            'order_shop_ids' => [$readyLeg->id],
        ])->assertNotFound();
    }

    public function test_non_staff_cannot_assign_a_rider_through_the_broad_order_update(): void
    {
        [$customer, $rider, $orderId, $orderShop] = $this->makeOrder(4);
        $otherRider = $this->makeUser(User::TYPE_RIDER);

        foreach ([$customer, $rider] as $actor) {
            Sanctum::actingAs($actor);
            $this->putJson("/api/orders/{$orderId}", [
                'rider_id' => $otherRider->id,
            ])->assertForbidden();
        }

        $this->assertSame($rider->id, (int) $orderShop->fresh()->rider_id);

        Sanctum::actingAs($this->makeUser(User::TYPE_ADMIN));
        $this->putJson("/api/orders/{$orderId}", [
            'rider_id' => $otherRider->id,
        ])->assertOk();
        $this->assertSame($otherRider->id, (int) $orderShop->fresh()->rider_id);
    }

    public function test_unrelated_user_cannot_use_an_idempotent_status_request_to_read_an_order(): void
    {
        [, , $orderId, $orderShop] = $this->makeOrder(4);
        $unrelatedCustomer = $this->makeUser(User::TYPE_CUSTOMER);
        Sanctum::actingAs($unrelatedCustomer);

        $this->putJson("/api/orders/{$orderId}/status", [
            'shop_id' => $orderShop->shop_id,
            'status' => 4,
        ])->assertForbidden();
    }

    public function test_pod_upload_completes_the_assigned_shop_leg(): void
    {
        Storage::fake('public');
        [, $rider, $orderId, $orderShop] = $this->makeOrder(5);
        Sanctum::actingAs($rider);

        $images = [];
        foreach (range(1, 5) as $number) {
            $images[] = UploadedFile::fake()->createWithContent(
                "proof-{$number}.png",
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=')
            );
        }

        $response = $this->post('/api/pod/upload', [
            'orderId' => $orderId,
            'orderShopId' => $orderShop->id,
            'images' => $images,
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'remarks' => 'Received by customer.',
            'status' => 'delivered',
        ], ['Accept' => 'application/json']);

        $response->assertCreated()
            ->assertJsonPath('data.orderShopId', $orderShop->id)
            ->assertJsonPath('data.status', 'delivered')
            ->assertJsonCount(5, 'data.imagePaths')
            ->assertJsonPath('data.imagePath', $response->json('data.imagePaths.0'));
        $this->assertDatabaseCount('proof_of_delivery_images', 5);
        foreach ($response->json('data.imagePaths') as $imagePath) {
            Storage::disk('public')->assertExists(str_replace('/storage/', '', $imagePath));
        }
        $this->assertSame(6, (int) $orderShop->fresh()->order_status);
        $this->assertDatabaseHas('order_logs', [
            'order_shop_id' => $orderShop->id,
            'to_status' => 'Delivered',
        ]);
    }

    public function test_failed_delivery_is_logged_without_completing_the_order(): void
    {
        Storage::fake('public');
        [, $rider, $orderId, $orderShop] = $this->makeOrder(5);
        Sanctum::actingAs($rider);
        $image = UploadedFile::fake()->createWithContent(
            'failed-proof.png',
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=')
        );

        $this->post('/api/pod/upload', [
            'orderId' => $orderId,
            'orderShopId' => $orderShop->id,
            'image' => $image,
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'remarks' => 'Recipient unavailable.',
            'status' => 'failed',
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->assertJsonPath('data.status', 'failed')
            ->assertJsonCount(1, 'data.imagePaths');

        $this->assertSame(5, (int) $orderShop->fresh()->order_status);
        $this->assertDatabaseHas('order_logs', [
            'order_shop_id' => $orderShop->id,
            'event' => 'delivery_failed',
            'from_status' => 'In-Transit',
            'to_status' => 'In-Transit',
        ]);
    }

    public function test_pod_upload_rejects_more_than_five_images(): void
    {
        Storage::fake('public');
        [, $rider, $orderId, $orderShop] = $this->makeOrder(5);
        Sanctum::actingAs($rider);
        $images = [];
        foreach (range(1, 6) as $number) {
            $images[] = $this->fakePodImage("proof-{$number}.png");
        }

        $this->post('/api/pod/upload', [
            'orderId' => $orderId,
            'orderShopId' => $orderShop->id,
            'images' => $images,
            'latitude' => 14.5995,
            'longitude' => 120.9842,
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('images');

        $this->assertDatabaseCount('proof_of_delivery', 0);
        $this->assertDatabaseCount('proof_of_delivery_images', 0);
    }

    public function test_reupload_replaces_the_existing_pod_image_set(): void
    {
        Storage::fake('public');
        [, $rider, $orderId, $orderShop] = $this->makeOrder(5);
        Sanctum::actingAs($rider);

        $firstResponse = $this->post('/api/pod/upload', [
            'orderId' => $orderId,
            'orderShopId' => $orderShop->id,
            'images' => [
                $this->fakePodImage('first.png'),
                $this->fakePodImage('second.png'),
                $this->fakePodImage('third.png'),
            ],
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'status' => 'failed',
        ], ['Accept' => 'application/json']);
        $firstResponse->assertCreated()->assertJsonCount(3, 'data.imagePaths');
        $oldPaths = $firstResponse->json('data.imagePaths');

        $secondResponse = $this->post('/api/pod/upload', [
            'orderId' => $orderId,
            'orderShopId' => $orderShop->id,
            'images' => [
                $this->fakePodImage('replacement-1.png'),
                $this->fakePodImage('replacement-2.png'),
            ],
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'status' => 'failed',
        ], ['Accept' => 'application/json']);
        $secondResponse->assertOk()->assertJsonCount(2, 'data.imagePaths');

        $this->assertDatabaseCount('proof_of_delivery', 1);
        $this->assertDatabaseCount('proof_of_delivery_images', 2);
        foreach ($oldPaths as $oldPath) {
            Storage::disk('public')->assertMissing(str_replace('/storage/', '', $oldPath));
        }
        foreach ($secondResponse->json('data.imagePaths') as $newPath) {
            Storage::disk('public')->assertExists(str_replace('/storage/', '', $newPath));
        }
    }

    public function test_pod_images_migration_backfills_legacy_image_paths(): void
    {
        [, $rider, $orderId, $orderShop] = $this->makeOrder(5);
        $proofId = DB::table('proof_of_delivery')->insertGetId([
            'order_id' => $orderId,
            'order_shop_id' => $orderShop->id,
            'rider_id' => $rider->id,
            'image_path' => '/storage/pod_images/legacy-proof.jpg',
            'status' => 'delivered',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        Schema::drop('proof_of_delivery_images');

        $migration = require database_path('migrations/2026_08_25_000001_create_proof_of_delivery_images_table.php');
        $migration->up();

        $this->assertDatabaseHas('proof_of_delivery_images', [
            'proof_of_delivery_id' => $proofId,
            'image_path' => '/storage/pod_images/legacy-proof.jpg',
            'sort_order' => 0,
        ]);
    }

    public function test_pod_update_replaces_images_and_read_endpoints_return_all_paths(): void
    {
        Storage::fake('public');
        [$customer, $rider, $orderId, $orderShop] = $this->makeOrder(5);
        Sanctum::actingAs($rider);

        $createResponse = $this->post('/api/pod/upload', [
            'orderId' => $orderId,
            'orderShopId' => $orderShop->id,
            'image' => $this->fakePodImage('initial.png'),
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'status' => 'failed',
        ], ['Accept' => 'application/json']);
        $proofId = $createResponse->json('data.id');
        $oldPath = $createResponse->json('data.imagePath');

        $updateResponse = $this->put("/api/pod/update/{$proofId}", [
            'images' => [
                $this->fakePodImage('updated-1.png'),
                $this->fakePodImage('updated-2.png'),
            ],
            'remarks' => 'Updated proof set.',
        ], ['Accept' => 'application/json']);
        $updateResponse->assertOk()
            ->assertJsonCount(2, 'data.imagePaths')
            ->assertJsonPath('data.imagePath', $updateResponse->json('data.imagePaths.0'));
        Storage::disk('public')->assertMissing(str_replace('/storage/', '', $oldPath));

        $this->getJson("/api/pod/show/{$proofId}")
            ->assertOk()
            ->assertJsonCount(2, 'data.imagePaths');

        Sanctum::actingAs($customer);
        $this->getJson("/api/pod/order/{$orderId}")
            ->assertOk()
            ->assertJsonCount(2, 'data.0.imagePaths');
    }

    public function test_no_contact_and_store_pickup_use_their_expected_flows(): void
    {
        $vendor = $this->makeUser(User::TYPE_VENDOR);
        $service = app(OrderStatusTransitionService::class);

        [, , $noContactOrderId, $noContactLeg] = $this->makeOrder(2);
        DB::table('order_details')
            ->where('id', DB::table('orders')->where('id', $noContactOrderId)->value('order_detail_id'))
            ->update(['delivery_method_id' => 2]);
        DB::table('agrivet_vendor')->insert([
            'shop_id' => $noContactLeg->shop_id,
            'vendor_id' => $vendor->id,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $service->transition($noContactLeg, 8, $vendor);
        $this->assertSame(8, (int) $noContactLeg->fresh()->order_status);

        [, , $pickupOrderId, $pickupLeg] = $this->makeOrder(2);
        DB::table('order_details')
            ->where('id', DB::table('orders')->where('id', $pickupOrderId)->value('order_detail_id'))
            ->update(['delivery_method_id' => 3]);
        DB::table('agrivet_vendor')->insert([
            'shop_id' => $pickupLeg->shop_id,
            'vendor_id' => $vendor->id,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $service->transition($pickupLeg, 3, $vendor);
        $service->transition($pickupLeg, 6, $vendor);
        $this->assertSame(6, (int) $pickupLeg->fresh()->order_status);
    }

    public function test_history_migration_links_unambiguous_legacy_rows_and_adds_baseline(): void
    {
        Schema::drop('proof_of_delivery_images');
        Schema::drop('proof_of_delivery');
        Schema::drop('order_logs');
        Schema::drop('order_shops');

        Schema::create('order_shops', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('shop_id');
            $table->unsignedBigInteger('rider_id')->nullable();
            $table->unsignedBigInteger('order_status');
            $table->timestamps();
        });
        Schema::create('order_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->string('event');
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 3)->nullable();
            $table->string('payment_reference')->nullable();
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
        });
        Schema::create('proof_of_delivery', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('rider_id')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('image_path')->nullable();
            $table->text('remarks')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
        });

        [, $rider, $orderId] = $this->makeOrderWithoutShop();
        $shopId = $this->makeShop('Migration Shop');
        $orderShopId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $shopId,
            'rider_id' => $rider->id,
            'order_status' => 5,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $legacyLogId = DB::table('order_logs')->insertGetId([
            'order_id' => $orderId,
            'event' => 'status_changed',
            'from_status' => 'Ready for Delivery',
            'to_status' => 'In-Transit',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $proofId = DB::table('proof_of_delivery')->insertGetId([
            'order_id' => $orderId,
            'rider_id' => $rider->id,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $migration = require database_path('migrations/2026_08_24_000001_add_order_shop_context_to_order_history.php');
        $migration->up();

        $this->assertSame($orderShopId, (int) DB::table('order_logs')->where('id', $legacyLogId)->value('order_shop_id'));
        $this->assertSame($orderShopId, (int) DB::table('proof_of_delivery')->where('id', $proofId)->value('order_shop_id'));
        $this->assertDatabaseHas('order_logs', [
            'order_id' => $orderId,
            'order_shop_id' => $orderShopId,
            'event' => 'history_baseline',
            'to_status' => 'In-Transit',
        ]);
    }

    /** @return array{User, User, int, OrderShop} */
    private function makeOrder(int $statusId): array
    {
        $customer = $this->makeUser(User::TYPE_CUSTOMER);
        $rider = $this->makeUser(User::TYPE_RIDER);
        $shopId = $this->makeShop('Test Shop '.uniqid());
        $addressId = DB::table('addresses')->insertGetId([
            'recipient_name' => 'Chito Panilagan',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $detailId = DB::table('order_details')->insertGetId([
            'order_code' => 'ORD-'.uniqid(),
            'delivery_method_id' => 1,
            'address_id' => $addressId,
            'shipping_address' => 'Purok 8, San Isidro, Tagum City',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $orderId = DB::table('orders')->insertGetId([
            'user_id' => $customer->id,
            'order_detail_id' => $detailId,
            'ordered_at' => now(),
            'updated_at' => now(),
        ]);
        $orderShopId = DB::table('order_shops')->insertGetId([
            'order_id' => $orderId,
            'shop_id' => $shopId,
            'rider_id' => $rider->id,
            'order_status' => $statusId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$customer, $rider, $orderId, OrderShop::findOrFail($orderShopId)];
    }

    private function fakePodImage(string $name): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            $name,
            base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=')
        );
    }

    /** @return array{User, User, int} */
    private function makeOrderWithoutShop(): array
    {
        $customer = $this->makeUser(User::TYPE_CUSTOMER);
        $rider = $this->makeUser(User::TYPE_RIDER);
        $detailId = DB::table('order_details')->insertGetId([
            'order_code' => 'ORD-'.uniqid(),
            'delivery_method_id' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $orderId = DB::table('orders')->insertGetId([
            'user_id' => $customer->id,
            'order_detail_id' => $detailId,
            'ordered_at' => now(),
            'updated_at' => now(),
        ]);

        return [$customer, $rider, $orderId];
    }

    private function makeUser(string $type): User
    {
        $detailId = DB::table('user_details')->insertGetId([
            'first_name' => ucfirst($type),
            'last_name' => 'Tester',
            'email' => uniqid().'@example.test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $id = DB::table('users')->insertGetId([
            'user_detail_id' => $detailId,
            'user_type' => $type,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return User::findOrFail($id);
    }

    private function makeShop(string $name): int
    {
        return DB::table('shops')->insertGetId([
            'shop_name' => $name,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function seedReferenceData(): void
    {
        $statuses = [
            1 => 'Pending',
            2 => 'Preparing',
            3 => 'Ready for Pickup',
            4 => 'Ready for Delivery',
            5 => 'In-Transit',
            6 => 'Delivered',
            7 => 'Cancelled',
            8 => 'Ready for Drop off',
        ];
        foreach ($statuses as $id => $description) {
            DB::table('order_status')->insert([
                'id' => $id,
                'stat_description' => $description,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        DB::table('delivery_method')->insert([
            ['id' => 1, 'description' => 'Standard', 'status' => true],
            ['id' => 2, 'description' => 'No Contact', 'status' => true],
            ['id' => 3, 'description' => 'Pickup from Store', 'status' => true],
        ]);
    }

    private function createSchema(): void
    {
        Schema::create('user_details', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email');
            $table->timestamps();
        });
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_detail_id')->nullable();
            $table->string('user_type');
            $table->string('status')->nullable();
            $table->unsignedBigInteger('agrivet_id')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
        Schema::create('shops', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('agrivet_id')->nullable();
            $table->string('shop_name');
            $table->string('shop_address')->nullable();
            $table->decimal('shop_lat', 10, 7)->nullable();
            $table->decimal('shop_long', 10, 7)->nullable();
            $table->decimal('wallet_balance', 12, 2)->default(0);
            $table->timestamps();
        });
        Schema::create('agrivet_vendor', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('agrivet_id')->nullable();
            $table->unsignedBigInteger('shop_id')->nullable();
            $table->unsignedBigInteger('vendor_id');
            $table->string('status')->default('active');
            $table->timestamps();
        });
        Schema::create('delivery_method', function (Blueprint $table) {
            $table->id();
            $table->string('description');
            $table->boolean('status')->default(true);
            $table->timestamps();
        });
        Schema::create('order_status', function (Blueprint $table) {
            $table->id();
            $table->string('stat_description');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->string('recipient_name');
            $table->string('contact_number')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
        Schema::create('order_details', function (Blueprint $table) {
            $table->id();
            $table->string('order_code');
            $table->unsignedBigInteger('delivery_method_id');
            $table->unsignedBigInteger('address_id')->nullable();
            $table->string('shipping_address')->nullable();
            $table->decimal('shipping_fee', 10, 2)->default(0);
            $table->timestamps();
        });
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('order_detail_id');
            $table->timestamp('ordered_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
        Schema::create('order_shops', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('shop_id');
            $table->unsignedBigInteger('rider_id')->nullable();
            $table->unsignedBigInteger('order_status');
            $table->timestamps();
        });
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id');
            $table->string('item_name');
            $table->decimal('item_price', 10, 2);
            $table->json('item_images')->nullable();
            $table->timestamps();
        });
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('shop_id');
            $table->unsignedBigInteger('item_id')->nullable();
            $table->integer('quantity')->default(1);
            $table->decimal('price_at_purchase', 10, 2)->default(0);
            $table->timestamps();
        });
        Schema::create('order_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('order_shop_id')->nullable();
            $table->string('event');
            $table->string('from_status')->nullable();
            $table->string('to_status')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->decimal('amount', 12, 2)->nullable();
            $table->string('currency', 3)->nullable();
            $table->string('payment_reference')->nullable();
            $table->string('payment_method')->nullable();
            $table->text('notes')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
        });
        Schema::create('proof_of_delivery', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('order_shop_id')->nullable();
            $table->unsignedBigInteger('rider_id')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('image_path')->nullable();
            $table->text('remarks')->nullable();
            $table->string('status')->default('pending');
            $table->timestamps();
        });
        Schema::create('proof_of_delivery_images', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('proof_of_delivery_id');
            $table->string('image_path');
            $table->unsignedTinyInteger('sort_order');
            $table->timestamps();
        });
    }
}
