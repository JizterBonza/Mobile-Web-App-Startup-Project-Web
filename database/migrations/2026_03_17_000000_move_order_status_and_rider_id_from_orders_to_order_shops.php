<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Move order_status and rider_id from orders to order_shops, then remove from orders.
     */
    public function up(): void
    {
        $orders = DB::table('orders')->get(['id', 'order_status', 'rider_id']);
        $now = now();

        foreach ($orders as $order) {
            $orderStatus = $order->order_status ?? 1;
            $riderId = $order->rider_id;

            $existingOrderShops = DB::table('order_shops')->where('order_id', $order->id)->exists();
            if ($existingOrderShops) {
                DB::table('order_shops')
                    ->where('order_id', $order->id)
                    ->update([
                        'order_status' => $orderStatus,
                        'rider_id' => $riderId,
                        'updated_at' => $now,
                    ]);
            } else {
                // Order has no order_shops (e.g. created before order_shops table); create from order_items
                $shopIds = DB::table('order_items')
                    ->where('order_id', $order->id)
                    ->distinct()
                    ->pluck('shop_id');
                foreach ($shopIds as $shopId) {
                    DB::table('order_shops')->insert([
                        'order_id' => $order->id,
                        'shop_id' => $shopId,
                        'rider_id' => $riderId,
                        'order_status' => $orderStatus,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                }
            }
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['order_status']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['order_status', 'rider_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('order_status')->default(1)->after('order_detail_id');
            $table->unsignedBigInteger('rider_id')->nullable()->after('order_status');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('order_status')->references('id')->on('order_status')->onDelete('restrict');
        });

        // Copy back from order_shops (use first order_shop per order for consistency)
        $orderShops = DB::table('order_shops')
            ->select('order_id', 'order_status', 'rider_id')
            ->orderBy('id')
            ->get()
            ->unique('order_id');
        foreach ($orderShops as $os) {
            DB::table('orders')
                ->where('id', $os->order_id)
                ->update([
                    'order_status' => $os->order_status,
                    'rider_id' => $os->rider_id,
                ]);
        }
    }
};
