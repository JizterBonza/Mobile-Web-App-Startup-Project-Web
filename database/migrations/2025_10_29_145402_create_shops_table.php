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
        Schema::create('shops', function (Blueprint $table) {
            $table->id(); // Primary key

            // Foreign key linking to users table
            $table->unsignedBigInteger('user_id');

            // Shop details
            $table->string('shop_name', 150);
            $table->text('shop_description')->nullable();
            $table->string('shop_address', 255)->nullable();
            $table->decimal('shop_lat', 10, 7)->nullable();
            $table->decimal('shop_long', 10, 7)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->string('logo_url', 255)->nullable();

            // Ratings
            $table->decimal('average_rating', 3, 2)->default(0.00);
            $table->integer('total_reviews')->default(0);

            // Status
            $table->string('shop_status', 50)->default('active');

            // Timestamps
            $table->timestamps();

            // Foreign key constraint
            //$table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shops');
    }
};
