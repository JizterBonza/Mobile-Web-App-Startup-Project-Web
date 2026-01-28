<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if the category column exists and is a string type
        // We'll modify it to be an unsignedBigInteger for the foreign key
        Schema::table('items', function (Blueprint $table) {
            // Modify the category column from string to unsignedBigInteger
            // Note: This will set existing string values to NULL if they can't be converted
            $table->unsignedBigInteger('category')->nullable()->change();
        });

        // Add foreign key constraint after modifying the column
        Schema::table('items', function (Blueprint $table) {
            $table->foreign('category')->references('id')->on('category')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            // Drop foreign key constraint first
            $table->dropForeign(['category']);
        });

        Schema::table('items', function (Blueprint $table) {
            // Change back to string column
            $table->string('category', 100)->nullable()->change();
        });
    }
};
