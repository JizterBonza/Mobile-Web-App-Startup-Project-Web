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
        if (!Schema::hasTable('agrivet_vendor')) {
            Schema::create('agrivet_vendor', function (Blueprint $table) {
                $table->id();
                $table->foreignId('agrivet_id')->constrained('agrivets')->onDelete('cascade');
                $table->foreignId('vendor_id')->constrained('users')->onDelete('cascade');
                $table->string('status', 50)->default('active');
                $table->timestamps();
                
                // Ensure unique combination of agrivet and vendor
                $table->unique(['agrivet_id', 'vendor_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agrivet_vendor');
    }
};
