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
        $now = now();

        DB::table('order_status')->insert([
            'stat_description' => 'Ready for Drop off',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        DB::table('order_item_status')->insert([
            'stat_description' => 'Ready for Drop off',
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('order_status')->where('stat_description', 'Ready for Drop off')->delete();
        DB::table('order_item_status')->where('stat_description', 'Ready for Drop off')->delete();
    }
};
