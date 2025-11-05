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
        if (!Schema::hasTable('carts')) {
            Schema::create('carts', function (Blueprint $table) {
            $table->id(); // Primary key

            // Foreign keys
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('item_id');

            // Cart details
            $table->integer('quantity')->default(1);
            $table->decimal('price_snapshot', 10, 2); // price at time of adding
            $table->string('status', 50)->default('active'); // e.g. active, purchased, removed

            // Timestamps
            $table->timestamp('added_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            // Foreign key constraints
            // $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            // $table->foreign('item_id')->references('id')->on('items')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carts');
    }
};
