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
use App\Services\PaymentMethodResolver;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class FarmCheckoutTest extends TestCase
{
    use \Tests\Concerns\InstallsPaymentSecuritySchema;

    private User $customer;

    private User $owner;

    private User $admin;

    private User $partner;

    private Farm $farm;

    private array $remote = [];

    private int $sessionsCreated = 0;

    private bool $processing = false;

    private ?string $creationFailure = null;

    private ?string $testDatabase = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureDatabase();
        config()->set('services.paymongo.base_url', 'https://paymongo.test/v1');
        config()->set('services.paymongo.secret', 'test-key');
        config()->set('services.paymongo.webhook_secret', 'farm-test-secret');
        Carbon::setTestNow(Carbon::parse('2026-10-27 02:00:00', 'UTC'));
        $this->withoutMiddleware(\Illuminate\Routing\Middleware\ThrottleRequests::class);
        $this->createSchema();
        (require database_path('migrations/2026_10_27_000001_create_farm_checkout_tables.php'))->up();
        (require database_path('migrations/2026_10_30_000001_expand_payment_statuses_for_farm_checkout.php'))->up();
        $this->installPaymentSecuritySchema();
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
            $this->assertSame(0, DB::transactionLevel(), 'Provider I/O must not hold database locks.');
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
        try {
            Carbon::setTestNow();
            if ($this->testDatabase !== null) {
                DB::purge('farm_checkout_test');
                DB::connection('farm_checkout_admin')->statement("DROP DATABASE `{$this->testDatabase}`");
                DB::purge('farm_checkout_admin');
            }
        } finally {
            parent::tearDown();
        }
    }

    private function configureDatabase(): void
    {
        if (getenv('FARM_CHECKOUT_MYSQL_TESTS') !== '1') {
            config()->set('database.default', 'sqlite');
            config()->set('database.connections.sqlite.database', ':memory:');
            config()->set('database.connections.sqlite.url', null);
            DB::purge('sqlite');

            return;
        }

        // Opt in with FARM_CHECKOUT_MYSQL_TESTS=1; only server credentials are reused.
        $connection = config('database.connections.mysql');
        $connection['url'] = null;
        $connection['database'] = null;
        $connection['prefix'] = '';
        $connection['strict'] = true;
        config()->set('database.connections.farm_checkout_admin', $connection);
        $database = 'agrify_farm_checkout_test_'.str_replace('-', '', (string) Str::uuid());
        DB::connection('farm_checkout_admin')->statement("CREATE DATABASE `$database`");
        $this->testDatabase = $database;

        $connection['database'] = $database;
        config()->set('database.connections.farm_checkout_test', $connection);
        config()->set('database.default', 'farm_checkout_test');
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
        foreach (['per bird' => 1, 'per head' => 1, 'per pair' => 2, 'per trio' => 3, 'per quadruplet' => 4, 'per dozen' => 12] as $unit => $birds) {
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
        $response = $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'same-key']);
        $response->assertCreated()->assertJsonPath('data.status', 'awaiting_deposit');
        $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'same-key'])
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
        $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'stale'])->assertConflict();
        $quote = $this->quote([$entry->id]);
        $this->travel(11)->minutes();
        $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'expired'])->assertConflict();
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
        $this->postJson('/api/farm-orders', $this->orderInput($first), ['Idempotency-Key' => 'first'])->assertCreated();
        Sanctum::actingAs($other);
        $this->postJson('/api/farm-orders', $this->orderInput($second), ['Idempotency-Key' => 'second'])->assertConflict();
        $this->assertSame(2, $entry->listing->fresh()->reserved_stock);
    }

    public static function confirmedPaymentMethods(): array
    {
        $methods = [
            'gcash' => ['gcash', null, null, 41, false],
            'normalized gcash' => [' G-CaSh ', null, null, 41, false],
            'paymaya' => ['paymaya', null, null, 73, false],
            'maya alias' => ['maya', null, null, 73, false],
            'qrph' => ['qrph', null, null, 109, false],
            'normalized qrph' => ['QR_PH', null, null, 109, false],
            'inactive gcash' => ['gcash', null, null, 41, true],
            'unknown method' => ['new_wallet', null, null, null, false],
            'unknown preserves id' => ['new_wallet', 73, null, 73, false],
            'missing method' => [null, null, null, null, false],
            'missing preserves id' => [null, 73, null, 73, false],
            'missing uses recorded provider method' => [null, null, 'gcash', 41, false],
        ];
        $cases = [];
        foreach (['webhook', 'refresh'] as $path) {
            foreach ($methods as $name => $arguments) {
                $cases[$path.' '.$name] = [$path, ...$arguments];
            }
        }

        return $cases;
    }

    #[DataProvider('confirmedPaymentMethods')]
    public function test_confirmation_resolves_payment_method_ids_without_duplicate_side_effects(
        string $path,
        ?string $providerMethod,
        ?int $existingId,
        ?string $recordedMethod,
        ?int $expectedId,
        bool $inactive,
    ): void {
        if ($inactive) {
            DB::table('payment_methods')->where('id', 41)->update(['status' => false]);
        }
        $order = $this->makeOrder();
        $order->order->orderDetail->update(['payment_method' => $existingId]);
        $payment = $this->startPayment($order, 'deposit');
        $payment->update(['payment_method' => $recordedMethod]);
        $payload = $this->paidPayload($payment);
        $payload['attributes']['payments'][0]['attributes']['source'] = $providerMethod === null ? [] : ['type' => $providerMethod];
        $this->remote[$payment->checkout_session_id] = $payload;

        if ($path === 'webhook') {
            $this->webhook('checkout_session.payment.paid', $payload)->assertOk();
        } else {
            $this->getJson('/api/payment/status/'.$order->order_id)->assertOk()
                ->assertJsonPath('payment_status', 'partially_paid')
                ->assertJsonPath('amount_paid', $payment->amount);
        }

        $order->refresh();
        $this->assertNotNull($order->deposit_paid_at);
        $this->assertSame('awaiting_farm_confirmation', $order->status);
        $this->assertSame('allocated', $order->inventory_state);
        $this->assertDatabaseHas('payments', [
            'id' => $payment->id, 'status' => 'paid', 'payment_id' => 'pay_'.$payment->id,
            'payment_method' => $providerMethod ?? $recordedMethod,
        ]);
        $this->assertDatabaseHas('order_details', [
            'id' => $order->order->order_detail_id, 'payment_status' => 'partially_paid', 'payment_method' => $expectedId,
        ]);
        $notificationCount = Notification::count();
        for ($retry = 0; $retry < 2; $retry++) {
            $this->webhook('checkout_session.payment.paid', $payload)->assertOk();
            $this->getJson('/api/payment/status/'.$order->order_id)->assertOk()->assertJsonPath('payment_status', 'partially_paid');
        }

        $listing = FarmGamefowlListing::findOrFail($order->items()->first()->listing_id);
        $this->assertSame(98, $listing->stock);
        $this->assertSame(0, $listing->reserved_stock);
        $this->assertSame(1, $order->events()->where('event', 'payment_confirmed')->count());
        $this->assertSame($notificationCount, Notification::count());
        $this->assertSame(1, $this->sessionsCreated);
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseCount('payment_methods', 3);
    }

    public function test_method_resolution_prefers_exact_names_and_lowest_id_with_alias_fallback(): void
    {
        $resolver = app(PaymentMethodResolver::class);
        DB::table('payment_methods')->insert([
            ['id' => 7, 'name' => 'Maya', 'status' => false],
            ['id' => 9, 'name' => 'Pay Maya', 'status' => true],
            ['id' => 5, 'name' => 'G Cash', 'status' => false],
        ]);

        $this->assertSame(7, $resolver->resolveId('maya'));
        $this->assertSame(9, $resolver->resolveId('paymaya'));
        $this->assertSame(5, $resolver->resolveId('gcash'));
        DB::table('payment_methods')->whereIn('id', [9, 73])->delete();
        $this->assertSame(7, $resolver->resolveId('paymaya'));
        $this->assertNull($resolver->resolveId(null));
        $this->assertNull($resolver->resolveId(' -_ '));
        $this->assertNull($resolver->resolveId('unknown_wallet'));
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
        $this->assertDatabaseHas('order_details', ['id' => $order->order->order_detail_id, 'payment_status' => 'partially_paid', 'payment_method' => 109]);
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
        $balancePayload = $this->paidPayload($balance);
        $balancePayload['attributes']['payments'][0]['attributes']['source']['type'] = 'gcash';
        $this->remote[$balance->checkout_session_id] = $balancePayload;
        $this->getJson('/api/payment/status/'.$order->order_id)->assertOk()->assertJsonPath('payment_status', 'paid');
        $this->webhook('checkout_session.payment.paid', $balancePayload)->assertOk();
        $this->pay($balance);
        $this->pay($deposit);
        $this->assertDatabaseHas('payments', ['id' => $balance->id, 'status' => 'paid', 'payment_method' => 'gcash']);
        $this->assertDatabaseHas('order_details', ['id' => $order->order->order_detail_id, 'payment_status' => 'paid', 'payment_method' => 41]);
        $this->assertSame(2, $order->events()->where('event', 'payment_confirmed')->count());
        $this->assertSame(2, $this->sessionsCreated);
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
        $this->webhook('checkout_session.payment.paid', $payload)->assertOk();
        $this->assertDatabaseHas('payment_receipts', ['payment_id' => $deposit->id, 'status' => 'review']);
        $this->assertNull($order->fresh()->deposit_paid_at);
        Sanctum::actingAs($this->customer);
        $this->putJson('/api/orders/'.$order->order_id, ['total_amount' => 1])->assertConflict();
        $this->deleteJson('/api/orders/'.$order->order_id)->assertConflict();
        $this->getJson('/api/payment/checkout-url/'.$order->order_id)->assertConflict();
    }

    public function test_session_resume_reuses_provider_checkout_and_unpaid_reservation_expires_after_24_hours(): void
    {
        $order = $this->makeOrder();
        $first = $this->startPayment($order, 'deposit');
        $again = $this->startPayment($order, 'deposit');
        $this->assertSame($first->id, $again->id);
        $this->assertSame(1, $this->sessionsCreated);
        $this->travel(23)->hours();
        $this->artisan('payments:reconcile')->assertSuccessful();
        $this->assertSame('reserved', $order->fresh()->inventory_state);
        $this->assertDatabaseHas('notifications', ['type' => 'farm_reservation_expiring']);
        $this->travel(61)->minutes();
        $this->artisan('payments:reconcile')->assertSuccessful();
        $this->assertSame('released', $order->fresh()->inventory_state);
        $this->assertSame('expired', $first->fresh()->status);
        $this->artisan('payments:reconcile')->assertSuccessful();
        $this->assertSame(0, FarmGamefowlListing::first()->reserved_stock);
    }

    public function test_reservation_that_never_started_payment_is_notified_then_released_once(): void
    {
        $order = $this->makeOrder();
        $this->travel(25)->hours();
        $this->artisan('payments:reconcile')->assertSuccessful();
        $this->assertSame('reserved', $order->fresh()->inventory_state);
        $this->assertNotNull($order->fresh()->reservation_expiry_notified_at);
        $this->travel(1)->minutes();
        $this->artisan('payments:reconcile')->assertSuccessful();
        $this->assertSame('released', $order->fresh()->inventory_state);
        $this->assertSame(0, $this->sessionsCreated);
    }

    public function test_processing_or_unknown_provider_sessions_keep_inventory_after_deadline(): void
    {
        $order = $this->makeOrder();
        $this->startPayment($order, 'deposit');
        $this->processing = true;
        $this->travel(25)->hours();
        $this->artisan('payments:reconcile')->assertSuccessful();
        $this->travel(1)->minutes();
        $this->artisan('payments:reconcile')->assertSuccessful();
        $this->assertSame('reserved', $order->fresh()->inventory_state);
        $this->assertDatabaseHas('payment_reviews', ['order_id' => $order->order_id, 'reason' => 'reservation_payment_unverified']);
    }

    public function test_no_more_than_three_unpaid_reservations_per_customer_and_farm(): void
    {
        foreach (range(1, 3) as $i) {
            $this->makeOrder();
        }
        $entry = $this->entry();
        $quote = $this->quote([$entry->id]);
        $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'fourth'])->assertConflict();
        $this->assertDatabaseCount('farm_orders', 3);
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
        $id = $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'preorder'])->assertCreated()->json('data.id');
        $entry->listing->update(['price' => 999, 'bundle_name' => 'Edited']);
        $this->getJson('/api/farm-orders/'.$id)->assertOk()
            ->assertJsonPath('data.items.0.name', 'Breeding Trio')
            ->assertJsonPath('data.items.0.unit_price', '12000.00')
            ->assertJsonPath('data.items.0.bundle_catalog_ids.0', $bird->id)
            ->assertJsonCount(3, 'data.items.0.birds');
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
        $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'cart-changed'])->assertConflict();
        DB::table('addresses')->where('id', 1)->update(['user_id' => $this->partner->id]);
        $this->postJson('/api/farm-checkout/quote', $this->quoteInput([$entry->id]))->assertStatus(422);
    }

    public function test_successful_idempotency_replay_works_after_quote_expiry(): void
    {
        $entry = $this->entry();
        $quote = $this->quote([$entry->id]);
        $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'replay'])->assertCreated();
        $this->travel(11)->minutes();
        $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'replay'])->assertOk();
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

    public function test_bird_details_are_normalized_saved_and_returned_for_multiple_pairs(): void
    {
        $entry = $this->entry('per pair', 2);
        $quote = $this->quote([$entry->id]);
        $input = $this->orderInput($quote);
        $input['items'][0]['birds'] = [
            ['wingband_no' => ' 00123 ', 'feather_color' => ' Red ', 'feet_color' => ' Yellow '],
            ['feather_color' => 'White'], ['feet_color' => 'Yellow'], ['wingband_no' => 'ABC'],
        ];
        $expected = $input['items'][0]['birds'];
        $expected[0] = ['wingband_no' => '00123', 'feather_color' => 'Red', 'feet_color' => 'Yellow'];
        $response = $this->postJson('/api/farm-orders', $input, ['Idempotency-Key' => 'details'])
            ->assertCreated()->assertJsonPath('data.items.0.birds', $expected);
        $this->assertSame($expected, FarmOrder::first()->items()->first()->snapshot['birds']);
        $this->getJson('/api/farm-orders/'.$response->json('data.id'))->assertOk()->assertJsonPath('data.items.0.birds', $expected);
        $this->getJson('/api/farm-orders')->assertOk()->assertJsonPath('data.data.0.items.0.birds', $expected);
    }

    public function test_invalid_bird_details_leave_cart_inventory_and_orders_untouched(): void
    {
        $entry = $this->entry('per pair');
        $quote = $this->quote([$entry->id]);
        $valid = $this->orderInput($quote);
        $cases = [];
        $input = $valid;
        unset($input['items']);
        $cases[] = [$input, 'items'];
        foreach ([[], ['wingband_no' => '  ', 'feather_color' => null], ['feet_color' => 123], ['feather_color' => str_repeat('r', 101)]] as $bird) {
            $input = $valid;
            $input['items'][0]['birds'][0] = $bird;
            $cases[] = [$input, 'items.0.birds.0'.(isset($bird['feet_color']) ? '.feet_color' : (isset($bird['feather_color']) && is_string($bird['feather_color']) ? '.feather_color' : ''))];
        }
        $input = $valid;
        array_pop($input['items'][0]['birds']);
        $cases[] = [$input, 'items.0.birds'];
        $input = $valid;
        $input['items'][0]['birds'][] = ['feet_color' => 'Yellow'];
        $cases[] = [$input, 'items.0.birds'];
        $input = $valid;
        $input['items'][0]['listing_id'] = 99999;
        $cases[] = [$input, 'items.0.listing_id'];
        $input = $valid;
        $input['items'][] = ['listing_id' => 99999, 'birds' => [['feet_color' => 'Yellow']]];
        $cases[] = [$input, 'items.1.listing_id'];
        $input = $valid;
        $input['items'][] = $input['items'][0];
        $cases[] = [$input, 'items.0.listing_id'];
        foreach ($cases as [$input, $error]) {
            $this->postJson('/api/farm-orders', $input, ['Idempotency-Key' => 'invalid-details'])
                ->assertUnprocessable()->assertJsonValidationErrors($error);
            $this->assertDatabaseCount('farm_orders', 0);
            $this->assertDatabaseCount('orders', 0);
            $this->assertDatabaseCount('payments', 0);
            $this->assertDatabaseCount('farm_cart_items', 1);
            $this->assertSame(0, $entry->listing->fresh()->reserved_stock);
        }
    }

    public function test_listing_coverage_and_wingbands_are_validated_across_items(): void
    {
        $first = $this->entry();
        $second = $this->entry();
        $quote = $this->quote([$first->id, $second->id]);
        $input = $this->orderInput($quote);
        array_pop($input['items']);
        $this->postJson('/api/farm-orders', $input, ['Idempotency-Key' => 'coverage'])
            ->assertUnprocessable()->assertJsonValidationErrors('items');
        $input = $this->orderInput($quote);
        $input['items'][0]['birds'] = [['wingband_no' => ' AbC ']];
        $input['items'][1]['birds'] = [['wingband_no' => 'abc']];
        $this->postJson('/api/farm-orders', $input, ['Idempotency-Key' => 'duplicate'])
            ->assertUnprocessable()->assertJsonValidationErrors('items.1.birds.0.wingband_no');
        $this->assertDatabaseCount('farm_orders', 0);
        $this->assertDatabaseCount('farm_cart_items', 2);
        $this->assertSame(0, $first->listing->fresh()->reserved_stock);
        $this->assertSame(0, $second->listing->fresh()->reserved_stock);
        $input['items'][1]['birds'] = [['feet_color' => 'Yellow']];
        $this->postJson('/api/farm-orders', $input, ['Idempotency-Key' => 'valid-wingband'])->assertCreated();
        $next = $this->entry();
        $nextInput = $this->orderInput($this->quote([$next->id]));
        $nextInput['items'][0]['birds'] = [['wingband_no' => 'ABC']];
        $this->postJson('/api/farm-orders', $nextInput, ['Idempotency-Key' => 'separate-order'])->assertCreated();
    }

    public function test_idempotency_includes_normalized_birds_and_ignores_item_order(): void
    {
        $first = $this->entry();
        $second = $this->entry();
        $quote = $this->quote([$first->id, $second->id]);
        $input = $this->orderInput($quote);
        $input['items'][0]['birds'] = [['wingband_no' => '00123', 'feet_color' => 'Yellow']];
        $id = $this->postJson('/api/farm-orders', $input, ['Idempotency-Key' => 'normalized'])->assertCreated()->json('data.id');
        $input['items'][0]['birds'] = [['feet_color' => ' Yellow ', 'wingband_no' => ' 00123 ', 'feather_color' => '  ']];
        $input['items'] = array_reverse($input['items']);
        $input['items'][0] = ['birds' => $input['items'][0]['birds'], 'listing_id' => $input['items'][0]['listing_id']];
        $this->travel(11)->minutes();
        $this->postJson('/api/farm-orders', $input, ['Idempotency-Key' => 'normalized'])->assertOk()->assertJsonPath('data.id', $id);
        $input['items'][0]['birds'][0]['feather_color'] = 'White';
        $this->postJson('/api/farm-orders', $input, ['Idempotency-Key' => 'normalized'])->assertConflict();
        $this->assertDatabaseCount('farm_orders', 1);
        $this->assertSame(1, $first->listing->fresh()->reserved_stock);
        $this->assertSame(1, $second->listing->fresh()->reserved_stock);
    }

    public function test_historical_orders_and_token_only_replays_remain_supported(): void
    {
        $entry = $this->entry();
        $quote = $this->quote([$entry->id]);
        $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'legacy'])->assertCreated();
        $order = FarmOrder::first();
        $order->update(['request_hash' => hash('sha256', $quote['quote_token'])]);
        $item = $order->items()->first();
        $snapshot = $item->snapshot;
        unset($snapshot['birds']);
        $item->update(['snapshot' => $snapshot]);
        $this->travel(11)->minutes();
        $this->postJson('/api/farm-orders', ['quote_token' => $quote['quote_token']], ['Idempotency-Key' => 'legacy'])
            ->assertOk()->assertJsonMissingPath('data.items.0.birds');
        $this->getJson('/api/farm-orders/'.$order->order_id)->assertOk()->assertJsonMissingPath('data.items.0.birds');
        $this->assertDatabaseCount('farm_orders', 1);
        $this->assertSame(1, $entry->listing->fresh()->reserved_stock);
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

    private function orderInput(array $quote): array
    {
        return [
            'quote_token' => $quote['quote_token'],
            'items' => array_map(fn ($item) => [
                'listing_id' => $item['listing_id'],
                'birds' => array_fill(0, $item['bird_count'], ['feather_color' => 'Red']),
            ], $quote['items']),
        ];
    }

    private function makeOrder(string $fulfillment = 'delivery'): FarmOrder
    {
        $entry = $this->entry('per pair');
        $quote = $this->quote([$entry->id], $fulfillment);
        $id = $this->postJson('/api/farm-orders', $this->orderInput($quote), ['Idempotency-Key' => 'order-'.uniqid()])
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
        $raw = json_encode(['data' => ['attributes' => ['livemode' => false, 'type' => $type, 'data' => $data]]]);
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
            $t->unsignedBigInteger('payment_method')->nullable();
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
        (require database_path('migrations/2025_10_29_145921_create_payments_table.php'))->up();
        (require database_path('migrations/2026_03_14_085316_add_payment_url_to_payments_table.php'))->up();
        if (DB::connection()->getDriverName() === 'sqlite') {
            // The enum expansion migration targets MySQL; keep SQLite workflow fixtures permissive.
            Schema::table('payments', fn (Blueprint $table) => $table->string('status')->default('pending')->change());
        }
        (require database_path('migrations/2026_02_21_000002_create_payment_methods_table.php'))->up();
        DB::table('payment_methods')->delete();
        DB::table('payment_methods')->insert([
            ['id' => 41, 'name' => 'GCash', 'status' => true],
            ['id' => 73, 'name' => 'Paymaya', 'status' => true],
            ['id' => 109, 'name' => 'QR Ph', 'status' => true],
        ]);
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
