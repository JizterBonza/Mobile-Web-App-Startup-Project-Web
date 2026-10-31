<?php

namespace Tests\Feature;

use App\Models\Farm;
use App\Models\FarmCartItem;
use App\Models\FarmGamefowlListing;
use App\Models\FarmOrder;
use App\Models\GamefowlCatalog;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\User;
use App\Services\FarmOrderService;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FarmCheckoutTest extends TestCase
{
    private User $customer;

    private User $owner;

    private User $admin;

    private User $partner;

    private Farm $farm;

    private array $remote = [];

    private int $sessionsCreated = 0;

    private bool $processing = false;

    private ?string $creationFailure = null;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('services.paymongo.base_url', 'https://paymongo.test/v1');
        config()->set('services.paymongo.secret', 'test-key');
        config()->set('services.paymongo.webhook_secret', 'farm-test-secret');
        config()->set('services.paymongo.live_mode', false);
        DB::purge('sqlite');
        DB::reconnect('sqlite');
        Carbon::setTestNow(Carbon::parse('2026-10-27 02:00:00', 'UTC'));
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $this->createSchema();
        (require database_path('migrations/2026_10_27_000001_create_farm_checkout_tables.php'))->up();
        Schema::table('payments', function (Blueprint $table) {
            $table->unsignedBigInteger('owner_user_id')->nullable();
            $table->timestamp('last_reconciled_at')->nullable();
        });
        Schema::table('farm_orders', function (Blueprint $table) {
            $table->uuid('session_closure_key')->nullable();
            $table->timestamp('reservation_expires_at')->nullable();
            $table->timestamp('reservation_expiry_notified_at')->nullable();
        });
        Schema::create('payment_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('provider_payment_id')->unique();
            $table->unsignedBigInteger('payment_id')->nullable();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedBigInteger('amount_minor')->nullable();
            $table->string('currency', 10)->nullable();
            $table->string('status', 20);
            $table->string('reason')->nullable();
            $table->json('payload');
            $table->timestamps();
        });
        Schema::create('payment_reviews', function (Blueprint $table) {
            $table->id();
            $table->string('fingerprint')->unique();
            $table->unsignedBigInteger('order_id')->nullable();
            $table->unsignedBigInteger('payment_id')->nullable();
            $table->unsignedBigInteger('shop_id')->nullable();
            $table->string('reason');
            $table->json('details')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('status')->default('active');
            $table->timestamps();
        });
        Schema::create('payment_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_id')->unique();
            $table->string('body_hash', 64);
            $table->string('status', 20)->default('pending');
            $table->unsignedInteger('attempts')->default(0);
            $table->json('payload');
            $table->text('last_error')->nullable();
            $table->timestamps();
        });
        $this->farm = Farm::create(['name' => 'Test Farm', 'address' => 'Bay, Laguna', 'status' => 'active', 'latitude' => 14.0, 'longitude' => 121.0]);
        $this->customer = $this->user('customer');
        $this->owner = $this->user('owner_manager', $this->farm->id);
        $this->admin = $this->user('admin');
        $this->partner = $this->user('shipping_partner');
        DB::table('addresses')->insert([
            'id' => 1, 'user_id' => $this->customer->id, 'is_active' => true,
            'full_address' => 'Customer address', 'recipient_name' => 'Buyer', 'contact_number' => '09123456789',
        ]);
        DB::table('delivery_method')->insert([
            ['id' => 1, 'description' => 'Standard', 'status' => true],
            ['id' => 3, 'description' => 'Pickup from Store', 'status' => true],
        ]);
        Http::preventStrayRequests();
        Http::fake(function (ClientRequest $request) {
            if ($request->method() === 'POST' && $request->url() === 'https://paymongo.test/v1/checkout_sessions') {
                $id = 'cs_farm_'.++$this->sessionsCreated;
                if ($this->creationFailure === 'timeout') {
                    throw new \Illuminate\Http\Client\ConnectionException('Provider timed out after receiving the request.');
                }
                if ($this->creationFailure === 'rejected') {
                    return Http::response(['errors' => [['detail' => 'Provider rejected checkout']]], 422);
                }
                $attrs = $request['data']['attributes'];
                $this->remote[$id] = [
                    'id' => $id, 'attributes' => [
                        'status' => 'active', 'checkout_url' => 'https://checkout.test/'.$id,
                        'metadata' => $attrs['metadata'], 'payments' => [],
                        'amount' => $attrs['line_items'][0]['amount'],
                    ],
                ];

                return Http::response(['data' => $this->remote[$id]]);
            }
            $id = basename(str_replace('/expire', '', $request->url()));
            if (! isset($this->remote[$id])) {
                return Http::response(['errors' => [['detail' => 'Not found']]], 404);
            }
            if ($request->method() === 'POST') {
                if ($this->processing || $this->remote[$id]['attributes']['payments']) {
                    return Http::response(['errors' => [['detail' => 'Payment ongoing or paid']]], 400);
                }
                $this->remote[$id]['attributes']['status'] = 'expired';
            }

            return Http::response(['data' => $this->remote[$id]]);
        });
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_quote_counts_birds_boxes_and_excludes_shipping_from_deposit(): void
    {
        $entry = $this->entry('per pair', 2, 5000, 20);
        $data = $this->quote([$entry->id]);
        $this->assertSame(4, $data['bird_count']);
        $this->assertSame(2, $data['box_count']);
        $this->assertSame('10000.00', $data['chicken_subtotal']);
        $this->assertSame('3000.00', $data['deposit_due']);
        $this->assertSame('5000.00', $data['shipping_estimate_min']);
        $this->assertSame('7000.00', $data['shipping_estimate_max']);
        $this->assertNull($data['final_shipping_fee']);
        $this->assertSame(0, $entry->listing->fresh()->reserved_stock);
    }

    public function test_all_selling_units_and_odd_bird_box_rounding(): void
    {
        foreach (['per head' => 1, 'per pair' => 2, 'per trio' => 3, 'per quadruplet' => 4, 'per dozen' => 12] as $unit => $birds) {
            $entry = $this->entry($unit);
            $quote = $this->quote([$entry->id]);
            $this->assertSame($birds, $quote['bird_count']);
            $this->assertSame((int) ceil($birds / 2), $quote['box_count']);
        }
    }

    public function test_cart_groups_farms_and_enforces_ownership_and_single_farm_checkout(): void
    {
        $first = $this->entry();
        $otherFarm = Farm::create(['name' => 'Second', 'status' => 'active']);
        $second = $this->entry();
        $second->listing->update(['farm_id' => $otherFarm->id]);
        Sanctum::actingAs($this->customer);
        $this->getJson('/api/farm-cart')->assertOk()->assertJsonCount(2, 'data');
        $this->postJson('/api/farm-checkout/quote', $this->quoteInput([$first->id, $second->id]))->assertStatus(422);
        Sanctum::actingAs($this->user('customer'));
        $this->patchJson('/api/farm-cart/items/'.$first->id, ['quantity' => 2])->assertNotFound();
        $this->deleteJson('/api/farm-cart/items/'.$first->id)->assertNotFound();
        $this->postJson('/api/farm-checkout/quote', $this->quoteInput([$first->id]))->assertStatus(422);
    }

    public function test_order_creation_is_idempotent_and_reserves_once(): void
    {
        $entry = $this->entry('per pair', 2);
        $quote = $this->quote([$entry->id]);
        $response = $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'same-key']);
        $response->assertCreated()->assertJsonPath('data.status', 'awaiting_deposit');
        $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'same-key'])
            ->assertOk()->assertJsonPath('data.id', $response->json('data.id'));
        $this->assertDatabaseCount('farm_orders', 1);
        $this->assertSame(4, $entry->listing->fresh()->reserved_stock);
        $this->assertDatabaseCount('farm_cart_items', 0);
        $this->postJson('/api/farm-orders', ['quote_token' => 'different'], ['Idempotency-Key' => 'same-key'])->assertConflict();
    }

    public function test_stale_expired_and_manipulated_quotes_are_rejected(): void
    {
        $entry = $this->entry();
        $quote = $this->quote([$entry->id]);
        $entry->listing->update(['price' => 999]);
        $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'stale'])->assertConflict();
        $quote = $this->quote([$entry->id]);
        $this->travel(11)->minutes();
        $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'expired'])->assertConflict();
        $this->postJson('/api/farm-orders', ['quote_token' => 'invalid'], ['Idempotency-Key' => 'invalid'])->assertStatus(422);
        $this->assertSame(0, $entry->listing->fresh()->reserved_stock);
    }

    public function test_second_checkout_cannot_consume_birds_reserved_by_another_order(): void
    {
        $entry = $this->entry('per pair', 1, 5000, 2);
        $first = $this->quote([$entry->id]);
        $other = $this->user('customer');
        $secondEntry = FarmCartItem::create(['user_id' => $other->id, 'listing_id' => $entry->listing_id, 'quantity' => 1]);
        Sanctum::actingAs($other);
        $second = $this->postJson('/api/farm-checkout/quote', $this->quoteInput([$secondEntry->id], 'pickup'))->assertOk()->json('data');
        Sanctum::actingAs($this->customer);
        $this->postJson('/api/farm-orders', ['quote_token' => $first['quote_token']], ['Idempotency-Key' => 'first'])->assertCreated();
        Sanctum::actingAs($other);
        $this->postJson('/api/farm-orders', ['quote_token' => $second['quote_token']], ['Idempotency-Key' => 'second'])->assertConflict();
        $this->assertSame(2, $entry->listing->fresh()->reserved_stock);
    }

    public function test_full_delivery_flow_uses_two_payments_and_releases_only_after_full_payment(): void
    {
        $order = $this->makeOrder();
        $listing = $order->items()->first();
        $deposit = $this->startPayment($order, 'deposit');
        $this->pay($deposit);
        $this->pay($deposit);
        $order->refresh();
        $this->assertSame('allocated', $order->inventory_state);
        $this->assertSame(98, FarmGamefowlListing::find($listing->listing_id)->stock);
        $this->assertNull($order->fully_paid_at);
        $this->assertDatabaseHas('order_details', ['id' => $order->order->order_detail_id, 'payment_status' => 'partially_paid']);
        $this->assertDatabaseMissing('notifications', ['type' => 'farm_release_authorized']);
        $this->schedule($order, '2026-11-10', 2700);
        $data = app(FarmOrderService::class)->summary($order->refresh());
        $this->assertSame('2700.00', $data['final_shipping_fee']);
        $this->assertSame('9700.00', $data['remaining_balance']);
        $this->assertSame('2026-11-02T16:00:00+00:00', $data['balance_opens_at']);
        $this->assertSame('2026-11-09T15:59:59+00:00', $data['balance_due_at']);
        Sanctum::actingAs($this->customer);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/payment-session', ['purpose' => 'balance'])->assertConflict();
        Carbon::setTestNow('2026-11-03 00:01:00 Asia/Manila');
        $this->artisan('farm-orders:check-payments')->assertSuccessful();
        $this->artisan('farm-orders:check-payments')->assertSuccessful();
        $this->assertSame(1, Notification::where('type', 'farm_balance_open')->count());
        $balance = $this->startPayment($order, 'balance');
        $this->assertSame('9700.00', $balance->amount);
        $this->pay($balance);
        $this->pay($balance);
        $this->pay($deposit);
        $this->assertNotNull($order->fresh()->release_authorized_at);
        $this->assertSame(98, FarmGamefowlListing::find($listing->listing_id)->stock);
        $this->assertSame(1, Notification::where('type', 'farm_release_authorized')->where('user_id', $this->partner->id)->count());
        $this->assertSame(1, Notification::where('type', 'farm_release_authorized')->where('user_id', $this->owner->id)->count());
        $this->getJson('/api/payment/status/'.$order->order_id)->assertOk()->assertJsonPath('payment_status', 'paid')->assertJsonPath('amount_paid', '12700.00');
    }

    public function test_direct_pickup_has_zero_shipping_and_same_balance_window(): void
    {
        $order = $this->makeOrder('pickup');
        $this->pay($this->startPayment($order, 'deposit'));
        Sanctum::actingAs($this->owner);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/confirm')->assertOk();
        $this->putJson('/api/farm-orders/'.$order->order_id.'/pickup-schedule', ['pickup_date' => '2026-10-30'])
            ->assertOk()->assertJsonPath('data.final_shipping_fee', '0.00')->assertJsonPath('data.balance_payable', true);
        $balance = $this->startPayment($order, 'balance');
        $this->assertSame('7000.00', $balance->amount);
        $this->pay($balance);
        $this->assertNotNull($order->fresh()->release_authorized_at);
    }

    public function test_partner_assignment_confirmation_and_release_dates_are_enforced(): void
    {
        $order = $this->makeOrder();
        Sanctum::actingAs($this->owner);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/confirm')->assertNotFound();
        $this->pay($this->startPayment($order, 'deposit'));
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/admin/farm-orders/'.$order->order_id.'/shipping-partner', ['shipping_partner_id' => $this->partner->id])->assertOk();
        Sanctum::actingAs($this->partner);
        $this->putJson('/api/farm-orders/'.$order->order_id.'/shipping-confirmation', ['per_box_fee' => 2700, 'pickup_date' => '2026-11-10'])->assertConflict();
        Sanctum::actingAs($this->owner);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/confirm')->assertOk();
        Sanctum::actingAs($this->user('shipping_partner'));
        $this->getJson('/api/farm-orders/'.$order->order_id)->assertNotFound();
        $this->putJson('/api/farm-orders/'.$order->order_id.'/shipping-confirmation', ['per_box_fee' => 2700, 'pickup_date' => '2026-11-10'])->assertNotFound();
        Sanctum::actingAs($this->partner);
        $this->putJson('/api/farm-orders/'.$order->order_id.'/shipping-confirmation', ['per_box_fee' => 2700, 'pickup_date' => '2026-10-28'])->assertStatus(422);
        $order->update(['earliest_release_date' => '2026-11-15']);
        $this->putJson('/api/farm-orders/'.$order->order_id.'/shipping-confirmation', ['per_box_fee' => 2700, 'pickup_date' => '2026-11-10'])->assertStatus(422);
    }

    public function test_failed_attempt_retains_inventory_and_cancel_releases_once(): void
    {
        $order = $this->makeOrder();
        $payment = $this->startPayment($order, 'deposit');
        $this->webhook('checkout_session.payment.failed', $this->remote[$payment->checkout_session_id])->assertOk();
        $this->assertSame('pending', $payment->fresh()->status);
        $this->assertSame('reserved', $order->fresh()->inventory_state);
        Sanctum::actingAs($this->customer);
        $this->processing = true;
        $this->postJson('/api/farm-orders/'.$order->order_id.'/cancel')->assertConflict();
        $this->assertSame('reserved', $order->fresh()->inventory_state);
        $this->processing = false;
        $this->postJson('/api/farm-orders/'.$order->order_id.'/cancel')->assertOk();
        $this->postJson('/api/farm-orders/'.$order->order_id.'/cancel')->assertOk();
        $this->assertSame(0, FarmGamefowlListing::first()->reserved_stock);
        $this->assertSame(100, FarmGamefowlListing::first()->stock);
    }

    public function test_deadline_hold_blocks_payment_and_late_payment_never_releases(): void
    {
        $order = $this->makeOrder();
        $this->pay($this->startPayment($order, 'deposit'));
        $this->schedule($order, '2026-11-10');
        Carbon::setTestNow('2026-11-03 09:00:00 Asia/Manila');
        $balance = $this->startPayment($order, 'balance');
        Carbon::setTestNow('2026-11-10 00:00:00 Asia/Manila');
        $this->artisan('farm-orders:check-payments')->assertSuccessful();
        $this->assertSame('on_hold', $order->fresh()->status);
        Sanctum::actingAs($this->customer);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/payment-session', ['purpose' => 'balance'])->assertConflict();
        $this->pay($balance);
        $this->assertNotNull($order->fresh()->fully_paid_at);
        $this->assertNull($order->fresh()->release_authorized_at);
        $this->assertNotNull($order->fresh()->held_at);
    }

    public function test_rescheduling_closes_old_session_and_versions_notifications(): void
    {
        $order = $this->makeOrder();
        $this->pay($this->startPayment($order, 'deposit'));
        $this->schedule($order, '2026-10-30');
        $balance = $this->startPayment($order, 'balance');
        $this->processing = true;
        Sanctum::actingAs($this->partner);
        $this->putJson('/api/farm-orders/'.$order->order_id.'/shipping-confirmation', ['per_box_fee' => 2800, 'pickup_date' => '2026-11-20'])->assertConflict();
        $this->assertSame(1, $order->fresh()->schedule_version);
        $this->processing = false;
        $this->putJson('/api/farm-orders/'.$order->order_id.'/shipping-confirmation', ['per_box_fee' => 2800, 'pickup_date' => '2026-11-20'])
            ->assertOk()->assertJsonPath('data.schedule_version', 2)->assertJsonPath('data.balance_payable', false);
        $this->assertSame('expired', $balance->fresh()->status);
        $this->assertSame('expired', $this->remote[$balance->checkout_session_id]['attributes']['status']);
        Carbon::setTestNow('2026-11-10 09:00:00 Asia/Manila');
        $this->artisan('farm-orders:check-payments')->assertSuccessful();
        $this->assertNull($order->fresh()->held_at);
    }

    public function test_payment_amount_mismatch_is_rejected_and_legacy_mutations_are_blocked(): void
    {
        $order = $this->makeOrder();
        $deposit = $this->startPayment($order, 'deposit');
        $payload = $this->paidPayload($deposit);
        $payload['attributes']['payments'][0]['attributes']['amount'] = 1;
        $this->webhook('checkout_session.payment.paid', $payload)->assertStatus(500);
        $this->assertNull($order->fresh()->deposit_paid_at);
        Sanctum::actingAs($this->customer);
        $this->putJson('/api/orders/'.$order->order_id, ['total_amount' => 1])->assertConflict();
        $this->deleteJson('/api/orders/'.$order->order_id)->assertConflict();
        $this->getJson('/api/payment/checkout-url/'.$order->order_id)->assertConflict();
    }

    public function test_session_resume_reuses_provider_checkout_and_unpaid_order_has_no_timer(): void
    {
        $order = $this->makeOrder();
        $first = $this->startPayment($order, 'deposit');
        $again = $this->startPayment($order, 'deposit');
        $this->assertSame($first->id, $again->id);
        $this->assertSame(1, $this->sessionsCreated);
        $this->travel(40)->days();
        $this->artisan('farm-orders:check-payments')->assertSuccessful();
        $this->assertSame('reserved', $order->fresh()->inventory_state);
    }

    public function test_cart_add_merges_and_update_sets_absolute_quantity(): void
    {
        $entry = $this->entry('per pair');
        Sanctum::actingAs($this->customer);
        $this->postJson('/api/farm-cart/items', ['listing_id' => $entry->listing_id, 'quantity' => 2])
            ->assertCreated()->assertJsonPath('data.quantity', 3);
        $this->patchJson('/api/farm-cart/items/'.$entry->id, ['quantity' => 2])->assertOk()->assertJsonPath('data.quantity', 2);
        $this->assertDatabaseCount('farm_cart_items', 1);
        $this->patchJson('/api/farm-cart/items/'.$entry->id, ['quantity' => 51])->assertConflict();
        $this->patchJson('/api/farm-cart/items/'.$entry->id, ['quantity' => 0])->assertStatus(422);
        Sanctum::actingAs($this->partner);
        $this->postJson('/api/farm-cart/items', ['listing_id' => $entry->listing_id, 'quantity' => 1])->assertForbidden();
    }

    public function test_preorder_bundle_snapshot_survives_later_listing_changes(): void
    {
        $entry = $this->entry('per trio', 1, 12000);
        $bird = $entry->listing->gamefowl;
        $entry->listing->update([
            'is_bundle' => true, 'bundle_name' => 'Breeding Trio', 'bundle_catalog_ids' => [$bird->id],
            'release_option' => 'Set Release Date', 'release_date' => '2026-11-20',
        ]);
        $quote = $this->quote([$entry->id]);
        $this->assertSame('2026-11-20', $quote['earliest_release_date']);
        $this->assertSame(3, $quote['bird_count']);
        $this->assertSame(2, $quote['box_count']);
        $id = $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'preorder'])->assertCreated()->json('data.id');
        $entry->listing->update(['price' => 999, 'bundle_name' => 'Edited']);
        $this->getJson('/api/farm-orders/'.$id)->assertOk()
            ->assertJsonPath('data.items.0.name', 'Breeding Trio')
            ->assertJsonPath('data.items.0.unit_price', '12000.00')
            ->assertJsonPath('data.items.0.bundle_catalog_ids.0', $bird->id);
    }

    public function test_deposit_rounds_half_up_to_centavos(): void
    {
        $entry = $this->entry('per head', 1, 100.05);
        $this->assertSame('30.02', $this->quote([$entry->id])['deposit_due']);
    }

    public function test_changed_cart_and_another_customers_address_are_rejected(): void
    {
        $entry = $this->entry();
        $quote = $this->quote([$entry->id]);
        $entry->update(['quantity' => 2]);
        $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'cart-changed'])->assertConflict();
        DB::table('addresses')->where('id', 1)->update(['user_id' => $this->partner->id]);
        $this->postJson('/api/farm-checkout/quote', $this->quoteInput([$entry->id]))->assertStatus(422);
    }

    public function test_successful_idempotency_replay_works_after_quote_expiry(): void
    {
        $entry = $this->entry();
        $quote = $this->quote([$entry->id]);
        $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'replay'])->assertCreated();
        $this->travel(11)->minutes();
        $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'replay'])->assertOk();
        $this->assertDatabaseCount('farm_orders', 1);
    }

    public function test_creation_failure_keeps_order_and_known_rejection_can_be_retried(): void
    {
        $order = $this->makeOrder();
        $this->creationFailure = 'rejected';
        Sanctum::actingAs($this->customer);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/payment-session', ['purpose' => 'deposit'])->assertStatus(503);
        $this->assertSame('reserved', $order->fresh()->inventory_state);
        $this->creationFailure = null;
        $payment = $this->startPayment($order, 'deposit');
        $this->pay($payment);
        $this->assertNotNull($order->fresh()->deposit_paid_at);
        $this->assertDatabaseCount('farm_orders', 1);
    }

    public function test_ambiguous_provider_timeout_never_creates_a_second_payable_session(): void
    {
        $order = $this->makeOrder();
        $this->creationFailure = 'timeout';
        Sanctum::actingAs($this->customer);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/payment-session', ['purpose' => 'deposit'])->assertStatus(202)->assertJsonPath('data.status', 'creation_unknown');
        $this->postJson('/api/farm-orders/'.$order->order_id.'/payment-session', ['purpose' => 'deposit'])->assertStatus(202);
        $this->assertSame(1, $this->sessionsCreated);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/cancel')->assertConflict();
        $this->assertSame('reserved', $order->fresh()->inventory_state);
    }

    public function test_already_expired_provider_session_releases_inventory_only_once(): void
    {
        $order = $this->makeOrder();
        $payment = $this->startPayment($order, 'deposit');
        $this->remote[$payment->checkout_session_id]['attributes']['status'] = 'expired';
        Sanctum::actingAs($this->customer);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/cancel')->assertOk();
        $this->postJson('/api/farm-orders/'.$order->order_id.'/cancel')->assertOk();
        $this->assertSame(0, FarmGamefowlListing::first()->reserved_stock);
    }

    public function test_failed_attempt_before_successful_payment_in_one_callback_is_supported(): void
    {
        $order = $this->makeOrder();
        $payment = $this->startPayment($order, 'deposit');
        $payload = $this->paidPayload($payment);
        array_unshift($payload['attributes']['payments'], ['id' => 'pay_failed', 'attributes' => ['status' => 'failed']]);
        $this->webhook('checkout_session.payment.paid', $payload)->assertOk();
        $this->assertNotNull($order->fresh()->deposit_paid_at);
    }

    public function test_payment_found_during_rescheduling_is_committed_without_changing_quote(): void
    {
        $order = $this->makeOrder();
        $this->pay($this->startPayment($order, 'deposit'));
        $this->schedule($order, '2026-10-30');
        $payment = $this->startPayment($order, 'balance');
        $this->remote[$payment->checkout_session_id] = $this->paidPayload($payment);
        Sanctum::actingAs($this->partner);
        $this->putJson('/api/farm-orders/'.$order->order_id.'/shipping-confirmation', ['pickup_date' => '2026-11-20', 'per_box_fee' => 2800])->assertConflict();
        $this->assertSame('paid', $payment->fresh()->status);
        $this->assertSame(1, $order->fresh()->schedule_version);
        $this->assertNotNull($order->fresh()->fully_paid_at);
    }

    public function test_admin_can_resolve_a_late_paid_hold_with_a_new_pickup_date(): void
    {
        $order = $this->makeOrder();
        $this->pay($this->startPayment($order, 'deposit'));
        $this->schedule($order, '2026-10-30');
        $payment = $this->startPayment($order, 'balance');
        Carbon::setTestNow('2026-10-30 00:00:00 Asia/Manila');
        $this->pay($payment);
        $this->assertNotNull($order->fresh()->held_at);
        Sanctum::actingAs($this->partner);
        $this->putJson('/api/admin/farm-orders/'.$order->order_id.'/resolve-hold', ['pickup_date' => '2026-11-02', 'reason' => 'Agreed with customer'])->assertForbidden();
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/admin/farm-orders/'.$order->order_id.'/resolve-hold', ['pickup_date' => '2026-11-02', 'reason' => 'Agreed with customer'])
            ->assertOk()->assertJsonPath('data.release_authorized', true)->assertJsonPath('data.final_shipping_fee', '2700.00');
        $this->assertNull($order->fresh()->held_at);
        $this->assertDatabaseHas('farm_order_events', ['farm_order_id' => $order->id, 'event' => 'hold_resolved', 'actor_id' => $this->admin->id]);
    }

    private function user(string $type, ?int $farmId = null): User
    {
        return User::create(['user_type' => $type, 'status' => 'active', 'farm_id' => $farmId]);
    }

    private function entry(string $unit = 'per head', int $quantity = 1, float $price = 10000, int $stock = 100): FarmCartItem
    {
        $catalog = GamefowlCatalog::create(['name' => 'Gamefowl', 'sex' => 'male', 'status' => 'active', 'images' => []]);
        $listing = FarmGamefowlListing::create([
            'farm_id' => $this->farm->id, 'gamefowl_catalog_id' => $catalog->id,
            'price' => $price, 'stock' => $stock, 'selling_unit' => $unit,
            'release_option' => 'Release Immediately', 'status' => 'active', 'is_bundle' => false,
        ]);

        return FarmCartItem::create(['user_id' => $this->customer->id, 'listing_id' => $listing->id, 'quantity' => $quantity]);
    }

    private function quoteInput(array $ids, string $fulfillment = 'delivery'): array
    {
        return ['farm_id' => $this->farm->id, 'cart_item_ids' => $ids, 'fulfillment_method' => $fulfillment, 'shipping_address_id' => $fulfillment === 'delivery' ? 1 : null];
    }

    private function quote(array $ids, string $fulfillment = 'delivery'): array
    {
        Sanctum::actingAs($this->customer);

        return $this->postJson('/api/farm-checkout/quote', $this->quoteInput($ids, $fulfillment))->assertOk()->json('data');
    }

    public function test_farm_owner_manager_orders_page_lists_paid_farm_orders(): void
    {
        $entry = $this->entry('per pair');
        $quote = $this->quote([$entry->id]);
        $id = $this->postJson('/api/farm-orders', [
            'quote_token' => $quote['quote_token'],
            'items' => [[
                'listing_id' => $entry->listing_id,
                'birds' => [
                    ['wingband_no' => 'A1', 'feather_color' => 'red', 'feet_color' => 'yellow'],
                    ['wingband_no' => 'A2', 'feather_color' => 'black', 'feet_color' => 'yellow'],
                ],
            ]],
        ], ['Idempotency-Key' => 'owner-orders'])->assertCreated()->json('data.id');
        $order = FarmOrder::where('order_id', $id)->firstOrFail();

        $this->assertSame([], app(FarmOrderService::class)->ownerManagerCards($this->farm->id));

        $this->pay($this->startPayment($order, 'deposit'));
        $this->actingAs($this->owner);

        $request = \Illuminate\Http\Request::create('/dashboard/owner-manager/orders', 'GET');
        $request->headers->set('X-Inertia', 'true');
        $request->setUserResolver(fn () => $this->owner);
        $page = app(\App\Http\Controllers\DashboardController::class)
            ->ownerManagerOrders()
            ->toResponse($request);
        $orders = $page->getData(true)['props']['orders'];

        $this->assertCount(1, $orders);
        $this->assertSame($order->order_id, $orders[0]['id']);
        $this->assertSame('farm', $orders[0]['orderType']);
        $this->assertSame('new', $orders[0]['status']);
        $this->assertSame('Awaiting Confirmation', $orders[0]['statusDescription']);
        $this->assertSame('Buyer', $orders[0]['customerName']);
        $this->assertSame('Gamefowl', $orders[0]['products'][0]['name']);
        $this->assertSame(2, $orders[0]['products'][0]['birdCount']);

        app(\App\Http\Controllers\DashboardController::class)->ownerManagerConfirmFarmOrder($order->order_id);
        $order->refresh();
        $this->assertNotNull($order->confirmed_at);
        $this->assertSame('awaiting_schedule', $order->status);

        $confirmed = app(FarmOrderService::class)->ownerManagerCards($this->farm->id);
        $this->assertSame('preparing', $confirmed[0]['status']);
        $this->assertSame('Immediate', $confirmed[0]['statusDescription']);
        $this->assertFalse($confirmed[0]['farmSummary']['canConfirm']);
        $this->assertTrue($confirmed[0]['farmSummary']['releaseImmediate']);
        $this->assertTrue($confirmed[0]['farmSummary']['pickupImmediate']);
        $this->assertTrue($confirmed[0]['farmSummary']['showDonePreparing']);
        $this->assertNull($confirmed[0]['farmSummary']['preparedReleaseDate']);
        $this->assertNull($confirmed[0]['farmSummary']['riderPickupDate']);

        $this->schedule($order, '2026-10-30');
        $this->actingAs($this->owner);
        $withPickup = app(FarmOrderService::class)->ownerManagerCards($this->farm->id);
        $this->assertSame('scheduled', $order->fresh()->status);
        $this->assertSame('Immediate', $withPickup[0]['statusDescription']);

        app(\App\Http\Controllers\DashboardController::class)->ownerManagerDonePreparingFarmOrder($order->order_id);
        $prepared = app(FarmOrderService::class)->ownerManagerCards($this->farm->id);
        $this->assertSame('preparing', $prepared[0]['status']);
        $this->assertSame('Ready for Pickup', $prepared[0]['statusDescription']);
        $this->assertFalse($prepared[0]['farmSummary']['showDonePreparing']);
        $this->assertTrue($prepared[0]['farmSummary']['showReadyForPickup']);
        $this->assertSame('2026-10-27', $prepared[0]['farmSummary']['preparedReleaseDate']);
        $this->assertNull($prepared[0]['farmSummary']['riderPickupDate']);

        app(\App\Http\Controllers\DashboardController::class)->ownerManagerReadyForPickupFarmOrder($order->order_id);
        $ready = app(FarmOrderService::class)->ownerManagerCards($this->farm->id);
        $this->assertSame('ready_for_pickup', $order->fresh()->status);
        $this->assertSame('for-pickup', $ready[0]['status']);
        $this->assertSame('Ready for Pickup', $ready[0]['statusDescription']);
        $this->assertFalse($ready[0]['farmSummary']['showReadyForPickup']);

        $other = Farm::create(['name' => 'Other Farm', 'status' => 'active']);
        $this->assertSame([], app(FarmOrderService::class)->ownerManagerCards($other->id));
    }

    public function test_farm_order_with_a_release_date_shows_scheduled(): void
    {
        $entry = $this->entry('per head', 1);
        $entry->listing->update([
            'release_option' => 'Set Release Date',
            'release_date' => '2026-11-20',
        ]);
        $quote = $this->quote([$entry->id]);
        $id = $this->postJson('/api/farm-orders', [
            'quote_token' => $quote['quote_token'],
            'items' => [[
                'listing_id' => $entry->listing_id,
                'birds' => [
                    ['wingband_no' => 'B1', 'feather_color' => 'red', 'feet_color' => 'yellow'],
                ],
            ]],
        ], ['Idempotency-Key' => 'dated-release'])->assertCreated()->json('data.id');
        $order = FarmOrder::where('order_id', $id)->firstOrFail();
        $this->pay($this->startPayment($order, 'deposit'));
        $this->actingAs($this->owner);

        app(\App\Http\Controllers\DashboardController::class)->ownerManagerConfirmFarmOrder($order->order_id);

        $card = collect(app(FarmOrderService::class)->ownerManagerCards($this->farm->id))
            ->firstWhere('id', $order->order_id);
        $this->assertSame('awaiting_schedule', $order->fresh()->status);
        $this->assertSame('preparing', $card['status']);
        $this->assertSame('Scheduled', $card['statusDescription']);
        $this->assertFalse($card['farmSummary']['releaseImmediate']);
        $this->assertFalse($card['farmSummary']['showDonePreparing']);
    }

    private function makeOrder(string $fulfillment = 'delivery'): FarmOrder
    {
        $entry = $this->entry('per pair');
        $quote = $this->quote([$entry->id], $fulfillment);
        $id = $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'order-'.uniqid()])
            ->assertCreated()->json('data.id');

        return FarmOrder::where('order_id', $id)->firstOrFail();
    }

    private function startPayment(FarmOrder $order, string $purpose): Payment
    {
        Sanctum::actingAs($this->customer);
        $id = $this->postJson('/api/farm-orders/'.$order->order_id.'/payment-session', ['purpose' => $purpose])->assertOk()->json('data.payment_id');

        return Payment::findOrFail($id);
    }

    private function schedule(FarmOrder $order, string $date, int $rate = 2700): void
    {
        Sanctum::actingAs($this->owner);
        $this->postJson('/api/farm-orders/'.$order->order_id.'/confirm')->assertOk();
        Sanctum::actingAs($this->admin);
        $this->putJson('/api/admin/farm-orders/'.$order->order_id.'/shipping-partner', ['shipping_partner_id' => $this->partner->id])->assertOk();
        Sanctum::actingAs($this->partner);
        $this->putJson('/api/farm-orders/'.$order->order_id.'/shipping-confirmation', ['per_box_fee' => $rate, 'pickup_date' => $date])->assertOk();
    }

    private function paidPayload(Payment $payment): array
    {
        $payload = $this->remote[$payment->checkout_session_id];
        $payload['attributes']['paid_at'] = now()->timestamp;
        $payload['attributes']['payments'] = [[
            'id' => 'pay_'.$payment->id,
            'attributes' => ['status' => 'paid', 'amount' => (int) round((float) $payment->amount * 100), 'currency' => 'PHP',
                'source' => ['type' => 'qrph'], 'paid_at' => now()->timestamp, 'payment_intent_id' => 'pi_'.$payment->id],
        ]];

        return $payload;
    }

    private function pay(Payment $payment): void
    {
        $this->remote[$payment->checkout_session_id] = $this->paidPayload($payment);
        $this->webhook('checkout_session.payment.paid', $this->remote[$payment->checkout_session_id])->assertOk();
    }

    private function webhook(string $type, array $data)
    {
        $raw = json_encode(['data' => ['attributes' => ['type' => $type, 'livemode' => false, 'data' => $data]]]);
        $timestamp = (string) now()->timestamp;
        $signature = hash_hmac('sha256', $timestamp.'.'.$raw, 'farm-test-secret');

        return $this->call('POST', '/api/payment/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json',
            'HTTP_PAYMONGO_SIGNATURE' => 't='.$timestamp.',te='.$signature,
        ], $raw);
    }

    private function createSchema(): void
    {
        Schema::create('users', function (Blueprint $t) {
            $t->id();
            $t->string('user_type');
            $t->string('status');
            $t->unsignedBigInteger('farm_id')->nullable();
            $t->unsignedBigInteger('agrivet_id')->nullable();
            $t->timestamps();
        });
        Schema::create('farms', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('address')->nullable();
            $t->string('city')->nullable();
            $t->string('province')->nullable();
            $t->string('contact_number')->nullable();
            $t->decimal('latitude', 10, 7)->nullable();
            $t->decimal('longitude', 10, 7)->nullable();
            $t->string('status');
            $t->timestamps();
        });
        Schema::create('gamefowl_catalog', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('sex');
            $t->json('images')->nullable();
            $t->string('status');
            $t->timestamps();
        });
        Schema::create('farm_gamefowl_listings', function (Blueprint $t) {
            $t->id();
            $t->foreignId('farm_id');
            $t->foreignId('gamefowl_catalog_id');
            $t->decimal('price', 12, 2);
            $t->string('selling_unit');
            $t->integer('stock');
            $t->string('release_option');
            $t->date('release_date')->nullable();
            $t->boolean('is_bundle')->default(false);
            $t->string('bundle_name')->nullable();
            $t->json('bundle_catalog_ids')->nullable();
            $t->string('status');
            $t->timestamps();
        });
        Schema::create('addresses', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id');
            $t->boolean('is_active');
            $t->string('full_address');
            foreach (['recipient_name', 'contact_number', 'street_address', 'barangay', 'city_municipality', 'province', 'postal_code', 'latitude', 'longitude'] as $column) {
                $t->string($column)->nullable();
            }
            $t->timestamps();
            $t->softDeletes();
        });
        Schema::create('delivery_method', function (Blueprint $t) {
            $t->id();
            $t->string('description');
            $t->string('info')->nullable();
            $t->boolean('status');
        });
        Schema::create('order_details', function (Blueprint $t) {
            $t->id();
            $t->string('order_code');
            $t->decimal('subtotal', 10, 2);
            $t->decimal('shipping_fee', 10, 2)->default(0);
            $t->decimal('total_amount', 10, 2);
            $t->unsignedBigInteger('address_id')->nullable();
            $t->string('shipping_address');
            $t->text('order_instruction')->nullable();
            $t->unsignedBigInteger('delivery_method_id');
            $t->string('payment_method')->nullable();
            $t->boolean('checkout_is_cod')->nullable();
            $t->json('payment_snapshot')->nullable();
            $t->string('payment_status')->default('pending');
            $t->timestamps();
        });
        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id');
            $t->foreignId('order_detail_id');
            $t->timestamp('ordered_at')->nullable();
            $t->timestamp('updated_at')->nullable();
        });
        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id');
            $t->string('checkout_session_id')->nullable();
            $t->string('checkout_url')->nullable();
            $t->string('payment_intent_id')->nullable();
            $t->string('payment_id')->nullable();
            $t->decimal('amount', 10, 2);
            $t->string('currency')->default('PHP');
            $t->string('payment_method')->nullable();
            $t->string('status')->default('pending');
            $t->string('provider')->default('paymongo');
            $t->json('metadata')->nullable();
            $t->timestamps();
        });
        Schema::create('notifications', function (Blueprint $t) {
            $t->id();
            $t->foreignId('user_id');
            $t->string('type');
            $t->string('category');
            $t->string('title');
            $t->text('message');
            $t->string('reference_type')->nullable();
            $t->unsignedBigInteger('reference_id')->nullable();
            $t->json('data')->nullable();
            $t->boolean('read')->default(false);
            $t->timestamp('read_at')->nullable();
            $t->string('action_url')->nullable();
            $t->timestamps();
        });
        Schema::create('order_shops', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id');
            $t->foreignId('shop_id');
            $t->unsignedBigInteger('rider_id')->nullable();
            $t->integer('order_status')->default(1);
            $t->timestamps();
        });
    }
}
