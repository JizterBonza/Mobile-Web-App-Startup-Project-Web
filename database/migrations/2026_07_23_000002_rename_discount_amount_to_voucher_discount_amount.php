<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_details', function (Blueprint $table) {
            $table->renameColumn('discount_amount', 'voucher_discount_amount');
        });

        Schema::table('voucher_usages', function (Blueprint $table) {
            $table->renameColumn('discount_amount', 'voucher_discount_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_details', function (Blueprint $table) {
            $table->renameColumn('voucher_discount_amount', 'discount_amount');
        });

        Schema::table('voucher_usages', function (Blueprint $table) {
            $table->renameColumn('voucher_discount_amount', 'discount_amount');
        });
    }
};
