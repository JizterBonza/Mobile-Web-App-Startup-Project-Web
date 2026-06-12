<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const SHOP_ID = 13;

    private const ITEM_ID = 15;

    private const USER_ID = 1;

    /** @var list<string> */
    private const ORDER_CODES = [
        'SAMPLE-SHOP13-001',
        'SAMPLE-SHOP13-002',
        'SAMPLE-SHOP13-003',
    ];

    public function up(): void
    {
        if (DB::table('order_details')->whereIn('order_code', self::ORDER_CODES)->exists()) {
            return;
        }

        $item = DB::table('items')
            ->where('id', self::ITEM_ID)
            ->where('shop_id', self::SHOP_ID)
            ->first(['id', 'item_name', 'item_price']);

        if (!$item) {
            throw new RuntimeException(
                'Item id=' . self::ITEM_ID . ' for shop id=' . self::SHOP_ID . ' was not found.'
            );
        }

        $unitPrice = (float) $item->item_price;
        $itemName = $item->item_name;
        $now = now();
        $totalSoldQuantity = 0;

        $orders = [
            [
                'order_code' => self::ORDER_CODES[0],
                'quantity' => 1,
                'order_status' => 1,
                'item_status' => 1,
                'ordered_at' => $now->copy()->subDays(2),
            ],
            [
                'order_code' => self::ORDER_CODES[1],
                'quantity' => 2,
                'order_status' => 2,
                'item_status' => 2,
                'ordered_at' => $now->copy()->subDay(),
            ],
            [
                'order_code' => self::ORDER_CODES[2],
                'quantity' => 1,
                'order_status' => 4,
                'item_status' => 4,
                'ordered_at' => $now,
            ],
        ];

        foreach ($orders as $orderSeed) {
            $quantity = (int) $orderSeed['quantity'];
            $subtotal = round($unitPrice * $quantity, 2);
            $orderedAt = $orderSeed['ordered_at'];

            $orderDetailId = DB::table('order_details')->insertGetId([
                'order_code' => $orderSeed['order_code'],
                'subtotal' => $subtotal,
                'shipping_fee' => 0.00,
                'total_amount' => $subtotal,
                'address_id' => null,
                'shipping_address' => 'Sample shipping address for shop 13 order',
                'order_instruction' => 'Sample order (migration seed)',
                'delivery_method_id' => 1,
                'payment_method' => 1,
                'payment_status' => 'pending',
                'created_at' => $orderedAt,
                'updated_at' => $orderedAt,
            ]);

            $orderId = DB::table('orders')->insertGetId([
                'user_id' => self::USER_ID,
                'order_detail_id' => $orderDetailId,
                'ordered_at' => $orderedAt,
                'updated_at' => $orderedAt,
            ]);

            DB::table('order_items')->insert([
                'order_id' => $orderId,
                'item_id' => self::ITEM_ID,
                'shop_id' => self::SHOP_ID,
                'item_name_at_purchase' => $itemName,
                'quantity' => $quantity,
                'price_at_purchase' => $unitPrice,
                'original_price' => $unitPrice,
                'discount_percent_at_purchase' => 0,
                'item_status' => $orderSeed['item_status'],
                'created_at' => $orderedAt,
                'updated_at' => $orderedAt,
            ]);

            DB::table('order_shops')->insert([
                'order_id' => $orderId,
                'shop_id' => self::SHOP_ID,
                'rider_id' => null,
                'order_status' => $orderSeed['order_status'],
                'created_at' => $orderedAt,
                'updated_at' => $orderedAt,
            ]);

            $totalSoldQuantity += $quantity;
        }

        if ($totalSoldQuantity > 0) {
            DB::table('items')
                ->where('id', self::ITEM_ID)
                ->update([
                    'sold_count' => DB::raw('sold_count + ' . $totalSoldQuantity),
                    'item_quantity' => DB::raw('GREATEST(item_quantity - ' . $totalSoldQuantity . ', 0)'),
                    'updated_at' => $now,
                ]);
        }
    }

    public function down(): void
    {
        $orderDetailIds = DB::table('order_details')
            ->whereIn('order_code', self::ORDER_CODES)
            ->pluck('id');

        if ($orderDetailIds->isEmpty()) {
            return;
        }

        $orderIds = DB::table('orders')
            ->whereIn('order_detail_id', $orderDetailIds)
            ->pluck('id');

        $soldQuantity = (int) DB::table('order_items')
            ->whereIn('order_id', $orderIds)
            ->where('item_id', self::ITEM_ID)
            ->where('shop_id', self::SHOP_ID)
            ->sum('quantity');

        DB::table('order_items')->whereIn('order_id', $orderIds)->delete();
        DB::table('order_shops')->whereIn('order_id', $orderIds)->delete();
        DB::table('orders')->whereIn('id', $orderIds)->delete();
        DB::table('order_details')->whereIn('id', $orderDetailIds)->delete();

        if ($soldQuantity > 0) {
            DB::table('items')
                ->where('id', self::ITEM_ID)
                ->update([
                    'sold_count' => DB::raw('GREATEST(sold_count - ' . $soldQuantity . ', 0)'),
                    'item_quantity' => DB::raw('item_quantity + ' . $soldQuantity),
                    'updated_at' => now(),
                ]);
        }
    }
};
