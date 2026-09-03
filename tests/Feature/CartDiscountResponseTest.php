<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CartDiscountResponseTest extends TestCase
{
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        $this->createSchema();
        Carbon::setTestNow('2026-09-03 12:00:00');

        DB::table('users')->insert([
            'id' => 1,
            'status' => 'active',
            'user_type' => User::TYPE_CUSTOMER,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('zones')->insert([
            'id' => 1,
            'name' => 'Test Zone',
            'is_cod' => true,
        ]);

        DB::table('shops')->insert([
            'id' => 1,
            'zone_id' => 1,
            'shop_name' => 'Test Shop',
            'average_rating' => 0,
            'total_reviews' => 0,
        ]);

        $this->user = User::findOrFail(1);
        Sanctum::actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_active_manual_discount_returns_standardized_details_without_expiration(): void
    {
        $itemId = $this->createCartItem('manual', '50.00', null);

        $response = $this->getJson('/api/carts')->assertOk();
        $cart = $response->json('data.0');

        $this->assertEquals(10, $cart['discounted_price']);
        $this->assertSame('active', $cart['discount_status']);
        $this->assertSame([
            'original_price' => '20.00',
            'discounted_price' => '10.00',
            'discount_percent' => '50.00',
            'discount_type' => 'manual',
            'discount_expires_at' => null,
        ], $cart['discount_details']);
        $this->assertArrayNotHasKey('actual_discount', $cart['discount_details']);
        $this->assertSame($itemId, $cart['item']['id']);
    }

    public function test_active_timed_discount_uses_the_same_detail_keys(): void
    {
        $this->createCartItem('timed', '50.00', '2026-09-04 12:00:00');

        $response = $this->getJson('/api/carts')->assertOk();
        $cart = $response->json('data.0');

        $this->assertEquals(10, $cart['discounted_price']);
        $this->assertSame('active', $cart['discount_status']);
        $this->assertSame([
            'original_price',
            'discounted_price',
            'discount_percent',
            'discount_type',
            'discount_expires_at',
        ], array_keys($cart['discount_details']));
        $this->assertSame('timed', $cart['discount_details']['discount_type']);
        $this->assertNotNull($cart['discount_details']['discount_expires_at']);
        $this->assertArrayNotHasKey('actual_discount', $cart['discount_details']);
    }

    public function test_expired_timed_discount_is_inactive(): void
    {
        $this->createCartItem('timed', '50.00', '2026-09-02 12:00:00');

        $response = $this->getJson('/api/carts')->assertOk();
        $cart = $response->json('data.0');

        $this->assertEquals(20, $cart['discounted_price']);
        $this->assertSame('inactive', $cart['discount_status']);
        $this->assertNull($cart['discount_details']);
        $this->assertEquals(0, $cart['item']['active_discount_percent']);
    }

    public function test_removed_zero_and_invalid_type_discounts_are_inactive(): void
    {
        $this->createCartItem('manual', null, null);
        $this->createCartItem('manual', '0.00', null);
        $this->createCartItem(null, '50.00', null);
        $this->createCartItem('seasonal', '50.00', null);

        $response = $this->getJson('/api/carts')->assertOk();

        foreach ($response->json('data') as $cart) {
            $this->assertEquals(20, $cart['discounted_price']);
            $this->assertSame('inactive', $cart['discount_status']);
            $this->assertNull($cart['discount_details']);
        }
    }

    public function test_on_sale_returns_only_valid_manual_and_timed_discounts(): void
    {
        $manualId = $this->createItem('manual', '10.00', null);
        $timedId = $this->createItem('timed', '20.00', '2026-09-04 12:00:00');
        $this->createItem('timed', '30.00', '2026-09-02 12:00:00');
        $this->createItem(null, '40.00', null);

        $response = $this->getJson('/api/items/on-sale')->assertOk();

        $this->assertEqualsCanonicalizing(
            [$manualId, $timedId],
            array_column($response->json('data'), 'id'),
        );
        $response->assertJsonPath('count', 2);
    }

    private function createCartItem(?string $discountType, ?string $discountPercent, ?string $expiresAt): int
    {
        $itemId = $this->createItem($discountType, $discountPercent, $expiresAt);

        DB::table('carts')->insert([
            'user_id' => $this->user->id,
            'item_id' => $itemId,
            'quantity' => 1,
            'price_snapshot' => 20,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $itemId;
    }

    private function createItem(?string $discountType, ?string $discountPercent, ?string $expiresAt): int
    {
        return DB::table('items')->insertGetId([
            'shop_id' => 1,
            'item_name' => 'Discount test item',
            'item_price' => 20,
            'discount_percent' => $discountPercent,
            'discount_type' => $discountType,
            'discount_expires_at' => $expiresAt,
            'item_quantity' => 10,
            'item_status' => 'active',
            'average_rating' => 0,
            'total_reviews' => 0,
            'sold_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createSchema(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_detail_id')->nullable();
            $table->unsignedBigInteger('user_credential_id')->nullable();
            $table->string('status')->nullable();
            $table->string('user_type')->nullable();
            $table->timestamps();
        });

        Schema::create('zones', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->boolean('is_cod')->default(false);
        });

        Schema::create('shops', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('agrivet_id')->nullable();
            $table->unsignedBigInteger('zone_id')->nullable();
            $table->string('shop_name');
            $table->text('shop_description')->nullable();
            $table->string('shop_address')->nullable();
            $table->string('shop_city')->nullable();
            $table->string('shop_postal_code')->nullable();
            $table->string('shop_province')->nullable();
            $table->decimal('shop_lat', 10, 7)->nullable();
            $table->decimal('shop_long', 10, 7)->nullable();
            $table->string('contact_number')->nullable();
            $table->decimal('average_rating', 3, 2)->default(0);
            $table->integer('total_reviews')->default(0);
        });

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shop_id');
            $table->string('item_name');
            $table->text('item_description')->nullable();
            $table->decimal('item_price', 10, 2);
            $table->decimal('discount_percent', 5, 2)->nullable();
            $table->string('discount_type')->nullable();
            $table->dateTime('discount_expires_at')->nullable();
            $table->integer('item_quantity')->default(0);
            $table->string('category')->nullable();
            $table->text('item_images')->nullable();
            $table->string('item_status')->default('active');
            $table->decimal('average_rating', 3, 2)->default(0);
            $table->integer('total_reviews')->default(0);
            $table->integer('sold_count')->default(0);
            $table->timestamps();
        });

        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('item_id');
            $table->integer('quantity')->default(1);
            $table->decimal('price_snapshot', 10, 2);
            $table->string('status')->default('active');
            $table->timestamps();
        });
    }
}
