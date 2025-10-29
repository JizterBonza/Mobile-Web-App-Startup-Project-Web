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
        Schema::create('rating_reviews', function (Blueprint $table) {
            $table->id(); // Primary key

            // Foreign keys
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('item_id');
            $table->unsignedBigInteger('shop_id');
            $table->unsignedBigInteger('order_id')->nullable();

            // Rating and review
            $table->tinyInteger('rating')->unsigned();
            $table->text('review_text')->nullable();
            $table->json('review_images')->nullable();

            // Timestamps
            $table->timestamps();

            // Foreign key constraints
            // $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            // $table->foreign('item_id')->references('id')->on('items')->onDelete('cascade');
            // $table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');
            // $table->foreign('order_id')->references('id')->on('orders')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rating_reviews');
    }
};
