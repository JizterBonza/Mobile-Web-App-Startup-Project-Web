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
        Schema::table('proof_of_delivery', function (Blueprint $table) {
            // Drop the existing foreign key constraint
            $table->dropForeign(['order_id']);
        });

        Schema::table('proof_of_delivery', function (Blueprint $table) {
            // Add new foreign key constraint to orders table
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('proof_of_delivery', function (Blueprint $table) {
            // Drop the foreign key constraint to orders
            $table->dropForeign(['order_id']);
        });

        Schema::table('proof_of_delivery', function (Blueprint $table) {
            // Restore the original foreign key constraint to order_details
            $table->foreign('order_id')->references('id')->on('order_details')->onDelete('cascade');
        });
    }
};
