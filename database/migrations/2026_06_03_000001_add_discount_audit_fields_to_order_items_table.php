<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('original_price', 10, 2)->nullable()->after('price_at_purchase');
            $table->decimal('discount_percent_at_purchase', 5, 2)->nullable()->after('original_price');
        });

        DB::table('order_items')->update([
            'original_price' => DB::raw('price_at_purchase'),
            'discount_percent_at_purchase' => 0,
        ]);
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['original_price', 'discount_percent_at_purchase']);
        });
    }
};
