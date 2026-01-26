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
        // Create categories table
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('category_name', 150);
            $table->text('category_description')->nullable();
            $table->string('category_status', 50)->default('active');
            $table->timestamps();
        });

        // Add category_id foreign key to items table
        Schema::table('items', function (Blueprint $table) {
            $table->unsignedBigInteger('category_id')->nullable()->after('category');
            $table->foreign('category_id')->references('id')->on('categories')->onDelete('set null');
        });

        // Seed categories data
        $categories = [
            [
                'category_name' => 'Animal Feed',
                'category_description' => null,
                'category_status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category_name' => 'Feed Supplements',
                'category_description' => null,
                'category_status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category_name' => 'Animal Vitamins & Nutritional Supplements',
                'category_description' => null,
                'category_status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('categories')->insert($categories);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove foreign key and column from items table
        Schema::table('items', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });

        // Drop categories table
        Schema::dropIfExists('categories');
    }
};
