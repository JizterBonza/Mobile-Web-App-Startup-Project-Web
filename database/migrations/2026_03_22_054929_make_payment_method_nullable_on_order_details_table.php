<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_details', function (Blueprint $table) {
            $table->unsignedBigInteger('payment_method')->nullable()->default(null)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('order_details')->whereNull('payment_method')->update(['payment_method' => 1]);

        Schema::table('order_details', function (Blueprint $table) {
            $table->unsignedBigInteger('payment_method')->default(1)->change();
        });
    }
};
