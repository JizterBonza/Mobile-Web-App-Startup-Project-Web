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
        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedBigInteger('item_status_new')->nullable()->after('price_at_purchase');
        });

        // Map existing string values to order_item_status IDs (1=Pending, 2=Processing, 3=Ready for Pickup, 4=In-Transit, 5=Delivered, 6=Cancelled)
        $map = [
            'ordered' => 1,
            'pending' => 1,
            'processing' => 2,
            'ready for pickup' => 3,
            'in-transit' => 4,
            'shipped' => 4,
            'delivered' => 5,
            'cancelled' => 6,
        ];

        $rows = DB::table('order_items')->get(['id', 'item_status']);
        foreach ($rows as $row) {
            $statusId = $map[strtolower(trim($row->item_status ?? ''))] ?? 1;
            DB::table('order_items')->where('id', $row->id)->update(['item_status_new' => $statusId]);
        }

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('item_status');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->unsignedBigInteger('item_status')->default(1)->after('price_at_purchase');
        });

        DB::table('order_items')->update(['item_status' => DB::raw('item_status_new')]);

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('item_status_new');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('item_status_old', 50)->nullable()->after('price_at_purchase');
        });

        $statusDescriptions = DB::table('order_item_status')->pluck('stat_description', 'id')->map(fn ($d) => strtolower($d))->toArray();

        $rows = DB::table('order_items')->get(['id', 'item_status']);
        foreach ($rows as $row) {
            $description = $statusDescriptions[$row->item_status] ?? 'pending';
            DB::table('order_items')->where('id', $row->id)->update(['item_status_old' => $description]);
        }

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('item_status');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->string('item_status', 50)->default('ordered')->after('price_at_purchase');
        });

        DB::table('order_items')->update(['item_status' => DB::raw('item_status_old')]);

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('item_status_old');
        });
    }
};
