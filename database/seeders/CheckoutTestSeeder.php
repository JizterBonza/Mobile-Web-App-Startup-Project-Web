<?php

namespace Database\Seeders;

use App\Models\Address;
use App\Models\Cart;
use App\Models\Item;
use App\Models\Shop;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CheckoutTestSeeder extends Seeder
{
    /**
     * Minimal agrivet → shop → item → address → cart for voucher/order API testing.
     */
    public function run(): void
    {
        $userId = User::query()->orderBy('id')->value('id');
        if (! $userId) {
            throw new \RuntimeException('No users found. Seed a user first.');
        }

        $zoneId = DB::table('zones')->insertGetId([
            'name' => 'Test Zone',
            'description' => 'Sample zone for checkout testing',
            'boundary' => json_encode([
                ['lat' => 14.1600, 'lng' => 121.2200],
                ['lat' => 14.1700, 'lng' => 121.2200],
                ['lat' => 14.1700, 'lng' => 121.2300],
                ['lat' => 14.1600, 'lng' => 121.2300],
            ]),
            'is_cod' => true,
            'status' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $categoryId = DB::table('category')->insertGetId([
            'category_name' => 'Test Feeds',
            'category_description' => 'Sample category',
            'category_rate' => 5.00,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $agrivetId = DB::table('agrivets')->insertGetId([
            'name' => 'Test Agrivet',
            'registered_business_name' => 'Test Agrivet Co',
            'owner_name' => 'Test Owner',
            'description' => 'Sample agrivet for checkout testing',
            'contact_number' => '09171234567',
            'email' => 'test-agrivet@example.com',
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $shop = Shop::create([
            'agrivet_id' => $agrivetId,
            'zone_id' => $zoneId,
            'shop_name' => 'Test Shop Los Banos',
            'shop_description' => 'Sample shop for checkout testing',
            'shop_address' => '123 Test St',
            'shop_city' => 'Los Baños',
            'shop_postal_code' => '4030',
            'shop_province' => 'Laguna',
            'shop_lat' => 14.1645,
            'shop_long' => 121.2418,
            'contact_number' => '09170001111',
            'shop_status' => 'active',
        ]);

        // ₱250 × qty 2 = ₱500 subtotal → meets SAVE10 / FLAT50 mins and MOV ₱300
        $item = Item::create([
            'shop_id' => $shop->id,
            'item_name' => 'Sample Chicken Feed 1kg',
            'item_description' => 'Test item for voucher order flow',
            'item_price' => 250.00,
            'item_quantity' => 100,
            'weight' => 1.00,
            'metric' => 'kg',
            'category' => $categoryId,
            'item_status' => 'active',
            'is_bundle' => false,
        ]);

        $address = Address::create([
            'user_id' => $userId,
            'address_label' => 'Home',
            'address_type' => Address::TYPE_HOME,
            'recipient_name' => 'Test Customer',
            'contact_number' => '09171234567',
            'region' => 'Region IV-A (CALABARZON)',
            'province' => 'Laguna',
            'city_municipality' => 'Los Baños',
            'barangay' => 'Batong Malake',
            'postal_code' => '4030',
            'street_address' => '456 Sample Road',
            'full_address' => '456 Sample Road, Batong Malake, Los Baños, Laguna 4030',
            'latitude' => 14.1650,
            'longitude' => 121.2420,
            'is_default' => true,
            'is_active' => true,
        ]);

        $cart = Cart::create([
            'user_id' => $userId,
            'item_id' => $item->id,
            'quantity' => 2,
            'price_snapshot' => $item->getEffectivePrice(),
            'status' => 'active',
        ]);

        $this->command?->info('Checkout test data ready:');
        $this->command?->table(
            ['Key', 'Value'],
            [
                ['user_id', $userId],
                ['address_id', $address->id],
                ['shop_id', $shop->id],
                ['item_id', $item->id],
                ['cart_id', $cart->id],
                ['unit_price', $item->getEffectivePrice()],
                ['quantity', $cart->quantity],
                ['subtotal', $item->getEffectivePrice() * $cart->quantity],
            ]
        );
    }
}
