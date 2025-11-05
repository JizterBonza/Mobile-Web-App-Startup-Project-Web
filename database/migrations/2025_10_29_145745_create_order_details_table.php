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
        if (!Schema::hasTable('order_details')) {
            Schema::create('order_details', function (Blueprint $table) {
            $table->id(); // Primary key

            // Unique order code
            $table->string('order_code', 100)->unique();

            // Amounts
            $table->decimal('subtotal', 10, 2);
            $table->decimal('shipping_fee', 10, 2)->default(0.00);
            $table->decimal('total_amount', 10, 2);

            // Shipping & delivery
            $table->text('shipping_address');
            $table->decimal('drop_location_lat', 10, 7)->nullable();
            $table->decimal('drop_location_long', 10, 7)->nullable();
            $table->text('order_instruction')->nullable();

            // Payment
            $table->string('payment_method', 50);
            $table->string('payment_status', 50)->default('pending');

            // Timestamps
            $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_details');
    }
};
