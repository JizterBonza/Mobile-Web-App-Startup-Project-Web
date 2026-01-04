<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('agrivet_id')->nullable();
            $table->unsignedBigInteger('shop_id')->nullable();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->enum('type', [
                'percentage_off',      // e.g., 10% off, 20% off
                'fixed_amount_off',    // e.g., $5 off
                'buy_x_get_y',         // e.g., buy 1 take 1, buy 2 take 1
                'bundle',              // e.g., product set bundle
                'free_shipping',       // free shipping
            ])->default('percentage_off');
            $table->decimal('discount_value', 10, 2)->nullable(); // For percentage_off or fixed_amount_off
            $table->integer('buy_quantity')->nullable();  // For buy_x_get_y: how many to buy
            $table->integer('get_quantity')->nullable();  // For buy_x_get_y: how many free
            $table->decimal('minimum_order_amount', 10, 2)->nullable(); // Minimum order to qualify
            $table->decimal('maximum_discount', 10, 2)->nullable(); // Cap for percentage discounts
            $table->json('applicable_items')->nullable(); // JSON array of item IDs or 'all'
            $table->json('bundle_items')->nullable(); // For bundles: JSON array of item IDs
            $table->decimal('bundle_price', 10, 2)->nullable(); // Special price for bundle
            $table->dateTime('start_date');
            $table->dateTime('end_date');
            $table->integer('usage_limit')->nullable(); // Max total uses
            $table->integer('usage_count')->default(0); // How many times used
            $table->integer('per_customer_limit')->nullable(); // Max uses per customer
            $table->string('promo_code', 50)->nullable()->unique(); // Optional coupon code
            $table->enum('status', ['active', 'inactive', 'expired', 'scheduled'])->default('active');
            $table->timestamps();

            // Indexes
            $table->index('agrivet_id');
            $table->index('shop_id');
            $table->index('type');
            $table->index('status');
            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promotions');
    }
};

