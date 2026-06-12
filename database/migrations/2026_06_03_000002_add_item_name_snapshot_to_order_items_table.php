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
            $table->string('item_name_at_purchase', 150)->nullable()->after('shop_id');
        });

        DB::table('order_items')
            ->join('items', 'order_items.item_id', '=', 'items.id')
            ->whereNull('order_items.item_name_at_purchase')
            ->update([
                'order_items.item_name_at_purchase' => DB::raw('items.item_name'),
            ]);

        DB::table('order_items')
            ->whereNull('original_price')
            ->update(['original_price' => DB::raw('price_at_purchase')]);

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('original_price', 10, 2)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('item_name_at_purchase');
            $table->decimal('original_price', 10, 2)->nullable()->change();
        });
    }
};
