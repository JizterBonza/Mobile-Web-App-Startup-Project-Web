<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $categories = [
            [
                'category_name' => 'Tools',
                'category_description' => null,
                'category_image_url' => null,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category_name' => 'Seeds',
                'category_description' => null,
                'category_image_url' => null,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category_name' => 'Fertilizer',
                'category_description' => null,
                'category_image_url' => null,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category_name' => 'Equipment',
                'category_description' => null,
                'category_image_url' => null,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category_name' => 'Pesticides',
                'category_description' => null,
                'category_image_url' => null,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'category_name' => 'Plants',
                'category_description' => null,
                'category_image_url' => null,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('category')->insert($categories);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('category')
            ->whereIn('category_name', ['Tools', 'Seeds', 'Fertilizer', 'Equipment', 'Pesticides', 'Plants'])
            ->delete();
    }
};
