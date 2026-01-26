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
        $subCategories = [
            [
                'sub_category_name' => 'Heavy but small',
                'sub_category_description' => null,
                'sub_category_status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sub_category_name' => 'Light but large',
                'sub_category_description' => null,
                'sub_category_status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sub_category_name' => 'Heavy and large',
                'sub_category_description' => null,
                'sub_category_status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'sub_category_name' => 'Light and small',
                'sub_category_description' => null,
                'sub_category_status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('sub_categories')->insert($subCategories);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('sub_categories')
            ->whereIn('sub_category_name', [
                'Heavy but small',
                'Light but large',
                'Heavy and large',
                'Light and small'
            ])
            ->delete();
    }
};
