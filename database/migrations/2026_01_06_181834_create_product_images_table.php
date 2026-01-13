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
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('agrivet_id');
            $table->string('name', 150);
            $table->string('image_url', 500);
            $table->string('category', 100)->nullable();
            $table->string('status', 50)->default('active');
            $table->timestamps();
            
            // Index for faster lookups
            $table->index(['agrivet_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
