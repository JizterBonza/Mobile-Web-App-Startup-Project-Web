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
        Schema::create('payments', function (Blueprint $table) {
            $table->id(); // Primary key

            // Foreign key
            $table->unsignedBigInteger('order_id');

            // Payment details
            $table->string('payment_method', 50);
            $table->string('payment_status', 50)->default('pending');
            $table->decimal('amount_paid', 10, 2);
            $table->string('transaction_id', 100)->nullable(); 
            $table->text('payment_details')->nullable(); // receipt or response
            $table->timestamp('paid_at')->nullable();

            // Timestamps
            $table->timestamps();

            // Foreign key constraint
            //$table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
