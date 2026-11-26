<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('farm_order_items', function (Blueprint $table) {
            $table->unsignedBigInteger('vendor_unit_price_cents')->nullable()->after('unit_price_cents');
            $table->unsignedBigInteger('platform_fee_cents')->nullable()->after('vendor_unit_price_cents');
        });
    }

    public function down(): void
    {
        Schema::table('farm_order_items', function (Blueprint $table) {
            $table->dropColumn(['vendor_unit_price_cents', 'platform_fee_cents']);
        });
    }
};
