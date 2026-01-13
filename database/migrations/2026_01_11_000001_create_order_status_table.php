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
        Schema::create('order_status', function (Blueprint $table) {
            $table->id();
            $table->string('stat_description');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Insert default order statuses
        DB::table('order_status')->insert([
            [
                'stat_description' => 'Pending',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'stat_description' => 'Processing',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'stat_description' => 'Ready for Pickup',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'stat_description' => 'In-Transit',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'stat_description' => 'Delivered',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'stat_description' => 'Cancelled',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_status');
    }
};


