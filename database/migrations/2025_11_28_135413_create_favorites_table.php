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
        if (!Schema::hasTable('favorites')) {
            Schema::create('favorites', function (Blueprint $table) {
                $table->id(); // Primary key

                // Foreign keys
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('item_id');

                // Timestamps
                $table->timestamps();

                // Unique constraint to prevent duplicate favorites
                $table->unique(['user_id', 'item_id']);

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
        Schema::dropIfExists('favorites');
    }
};
