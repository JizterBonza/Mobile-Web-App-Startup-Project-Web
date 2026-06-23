<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_details', function (Blueprint $table) {
            $table->decimal('delivery_base_fee', 10, 2)->default(0.00)->after('shipping_fee');
            $table->decimal('delivery_km_fee', 10, 2)->default(0.00)->after('delivery_base_fee');
            $table->decimal('delivery_distance_km', 8, 3)->nullable()->after('delivery_km_fee');
            $table->boolean('is_reduced_base')->default(false)->after('delivery_distance_km');
            $table->decimal('heavy_surcharge', 10, 2)->default(0.00)->after('is_reduced_base');
            $table->unsignedSmallInteger('heavy_surcharge_units')->default(0)->after('heavy_surcharge');
            $table->decimal('total_weight_kg', 10, 3)->nullable()->after('heavy_surcharge_units');
            $table->decimal('multi_store_fee', 10, 2)->default(0.00)->after('total_weight_kg');
            $table->decimal('mov_penalty_fee', 10, 2)->default(0.00)->after('multi_store_fee');
        });
    }

    public function down(): void
    {
        Schema::table('order_details', function (Blueprint $table) {
            $table->dropColumn([
                'delivery_base_fee',
                'delivery_km_fee',
                'delivery_distance_km',
                'is_reduced_base',
                'heavy_surcharge',
                'heavy_surcharge_units',
                'total_weight_kg',
                'multi_store_fee',
                'mov_penalty_fee',
            ]);
        });
    }
};
