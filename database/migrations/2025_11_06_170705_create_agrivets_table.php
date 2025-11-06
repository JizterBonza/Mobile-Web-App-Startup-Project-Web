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
        if (!Schema::hasTable('agrivets')) {
            Schema::create('agrivets', function (Blueprint $table) {
                $table->id();
                
                // Agrivet details
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->string('address', 255)->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->string('contact_number', 20)->nullable();
                $table->string('email', 255)->nullable();
                $table->string('logo_url', 255)->nullable();
                
                // Status
                $table->string('status', 50)->default('active');
                
                // Timestamps
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agrivets');
    }
};
