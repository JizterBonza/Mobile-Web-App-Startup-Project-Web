<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('delivery_revenue_settings')) {
            Schema::create('delivery_revenue_settings', function (Blueprint $table) {
                $table->id();

                $table->decimal('reduced_base_fee', 10, 2);
                $table->decimal('standard_base_fee', 10, 2);
                $table->decimal('reduced_base_weight_threshold_kg', 8, 3);
                $table->decimal('included_km', 8, 3);
                $table->decimal('km_rate', 10, 2);

                $table->decimal('weight_free_tier_kg', 8, 3);
                $table->decimal('weight_block_kg', 8, 3);
                $table->unsignedSmallInteger('heavy_tier1_max_units');
                $table->decimal('heavy_tier1_fee', 10, 2);
                $table->unsignedSmallInteger('heavy_tier2_max_units');
                $table->decimal('heavy_tier2_fee', 10, 2);
                $table->decimal('heavy_tier3_fee', 10, 2);
                $table->decimal('single_item_heavy_exempt_tolerance_kg', 8, 3);

                $table->unsignedSmallInteger('max_stores_per_order');
                $table->decimal('inter_store_radius_km', 8, 3);
                $table->unsignedSmallInteger('multi_store_promo_months');
                $table->decimal('multi_store_fee_per_extra_store', 10, 2);
                $table->decimal('multi_store_third_store_fee', 10, 2);

                $table->decimal('mov_first_store', 10, 2);
                $table->decimal('mov_first_store_penalty_fee', 10, 2)->default(25.00);
                $table->decimal('mov_consecutive_store', 10, 2);
                $table->decimal('mov_penalty_base_fee', 10, 2);
                $table->decimal('mov_consecutive_store_met_fee', 10, 2)->default(15.00);

                $table->unsignedSmallInteger('pickup_delivery_method_id')->default(3);

                $table->enum('status', ['active', 'archived', 'draft'])->default('draft');
                $table->text('note')->nullable();

                $table->timestamps();

                $table->index('status');
            });
        }

        $exists = DB::table('delivery_revenue_settings')->where('status', 'active')->exists();
        if (! $exists) {
            DB::table('delivery_revenue_settings')->insert([
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
                'status' => 'active',
                'note' => 'Initial seed — Delivery Revenue Section B defaults',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (Schema::hasTable('handling_fee_settings')) {
            Schema::drop('handling_fee_settings');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_revenue_settings');

        if (! Schema::hasTable('handling_fee_settings')) {
            Schema::create('handling_fee_settings', function (Blueprint $table) {
                $table->id();
                $table->decimal('free_until_kg', 8, 3);
                $table->decimal('base_fee', 10, 2);
                $table->decimal('increment_threshold_kg', 8, 3);
                $table->decimal('increment_block_kg', 8, 3);
                $table->decimal('increment_fee_per_block', 10, 2);
                $table->decimal('max_fee', 10, 2);
                $table->enum('status', ['active', 'archived', 'draft'])->default('draft');
                $table->text('note')->nullable();
                $table->timestamps();
                $table->index('status');
            });
        }
    }
};
