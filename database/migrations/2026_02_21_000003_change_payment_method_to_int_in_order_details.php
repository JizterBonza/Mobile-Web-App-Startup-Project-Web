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
        // Set all existing values to 1 before changing column type (column is non-nullable)
        DB::table('order_details')->update(['payment_method' => '1']);

        Schema::table('order_details', function (Blueprint $table) {
            $table->unsignedBigInteger('payment_method')->default(1)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_details', function (Blueprint $table) {
            $table->string('payment_method', 50)->change();
        });
    }
};
