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
        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('order_status_new')->nullable()->after('order_detail_id');
        });

        // Map existing string values to order_status IDs (1=Pending, 2=Preparing, 3=Ready for Pickup, 4=Ready for Delivery, 5=In-Transit, 6=Delivered, 7=Cancelled)
        $map = [
            'pending' => 1,
            'preparing' => 2,
            'ready for pickup' => 3,
            'ready for delivery' => 4,
            'in-transit' => 5,
            'delivered' => 6,
            'cancelled' => 7,
        ];

        $rows = DB::table('orders')->get(['id', 'order_status']);
        foreach ($rows as $row) {
            $statusId = $map[strtolower(trim($row->order_status ?? ''))] ?? 1;
            DB::table('orders')->where('id', $row->id)->update(['order_status_new' => $statusId]);
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('order_status');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('order_status')->default(1)->after('order_detail_id');
        });

        DB::table('orders')->update(['order_status' => DB::raw('order_status_new')]);

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('order_status_new');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('order_status_old', 50)->nullable()->after('order_detail_id');
        });

        $statusDescriptions = DB::table('order_status')->pluck('stat_description', 'id')->map(fn ($d) => strtolower($d))->toArray();

        $rows = DB::table('orders')->get(['id', 'order_status']);
        foreach ($rows as $row) {
            $description = $statusDescriptions[$row->order_status] ?? 'pending';
            DB::table('orders')->where('id', $row->id)->update(['order_status_old' => $description]);
        }

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('order_status');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->string('order_status', 50)->default('pending')->after('order_detail_id');
        });

        DB::table('orders')->update(['order_status' => DB::raw('order_status_old')]);

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('order_status_old');
        });
    }
};
