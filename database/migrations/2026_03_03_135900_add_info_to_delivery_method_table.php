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
        Schema::table('delivery_method', function (Blueprint $table) {
            $table->text('info')->nullable()->after('description');
        });

        // Update existing records with info based on description
        DB::table('delivery_method')
            ->where('description', 'Standard')
            ->update(['info' => 'Your order will be delivered directly to you.']);

        DB::table('delivery_method')
            ->where('description', 'No Contact')
            ->update(['info' => 'Your order will be left at your address for no contact delivery.']);

        DB::table('delivery_method')
            ->where('description', 'Pickup from Store')
            ->update(['info' => 'Pick up your order at the designated location.']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('delivery_method', function (Blueprint $table) {
            $table->dropColumn('info');
        });
    }
};
