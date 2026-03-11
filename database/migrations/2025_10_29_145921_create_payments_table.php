<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            // PayMongo references
            $table->string('checkout_session_id')->nullable();
            $table->string('payment_intent_id')->nullable();
            $table->string('payment_id')->nullable();

            // Payment details
            $table->decimal('amount', 10, 2);
            $table->string('currency')->default('PHP');
            $table->string('payment_method')->nullable();

            // status
            $table->enum('status', [
                'pending',
                'paid',
                'failed',
                'refunded',
                'partially_refunded'
            ])->default('pending');

            // provider
            $table->string('provider')->default('paymongo');

            // extra webhook payload
            $table->json('metadata')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
