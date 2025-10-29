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
        Schema::create('items', function (Blueprint $table) {
            $table->id(); // Primary key

            // Foreign key to shops
            $table->unsignedBigInteger('shop_id');

            // Item details
            $table->string('item_name', 150);
            $table->text('item_description')->nullable();
            $table->decimal('item_price', 10, 2);
            $table->integer('item_quantity')->default(0);
            $table->string('category', 100)->nullable();

            // JSON field for multiple images (e.g., ["img1.jpg", "img2.jpg"])
            $table->json('item_images')->nullable();

            // Status, ratings, reviews
            $table->string('item_status', 50)->default('active');
            $table->decimal('average_rating', 3, 2)->default(0.00);
            $table->integer('total_reviews')->default(0);
            $table->integer('sold_count')->default(0);

            // Timestamps
            $table->timestamps();

            // Foreign key constraint
            //$table->foreign('shop_id')->references('id')->on('shops')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
