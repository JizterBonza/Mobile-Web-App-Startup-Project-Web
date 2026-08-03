<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('delivery_revenue_settings', 'mov_first_store_penalty_fee')) {
            Schema::table('delivery_revenue_settings', function (Blueprint $table) {
                $table->decimal('mov_first_store_penalty_fee', 10, 2)
                    ->default(25.00)
                    ->after('mov_first_store');
            });
        }

        DB::table('delivery_revenue_settings')->update([
            'mov_first_store_penalty_fee' => 25.00,
        ]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('delivery_revenue_settings', 'mov_first_store_penalty_fee')) {
            Schema::table('delivery_revenue_settings', function (Blueprint $table) {
                $table->dropColumn('mov_first_store_penalty_fee');
            });
        }
    }
};
