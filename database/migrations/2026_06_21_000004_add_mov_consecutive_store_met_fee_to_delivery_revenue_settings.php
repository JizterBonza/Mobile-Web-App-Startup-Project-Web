<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('delivery_revenue_settings', function (Blueprint $table) {
            $table->decimal('mov_consecutive_store_met_fee', 10, 2)
                ->default(15.00)
                ->after('mov_penalty_base_fee');
        });

        DB::table('delivery_revenue_settings')->update([
            'mov_consecutive_store_met_fee' => 15.00,
        ]);
    }

    public function down(): void
    {
        Schema::table('delivery_revenue_settings', function (Blueprint $table) {
            $table->dropColumn('mov_consecutive_store_met_fee');
        });
    }
};
