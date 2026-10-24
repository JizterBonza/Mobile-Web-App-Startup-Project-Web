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
        if (Schema::hasTable('gamefarms')) {
            return;
        }

        Schema::create('gamefarms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('name', 150);
            $table->text('bloodlines')->nullable();
            $table->string('logo_path')->nullable();
            $table->string('membership_certificate_path')->nullable();
            $table->json('facility_images')->nullable();
            $table->unsignedTinyInteger('primary_facility_index')->default(0);
            $table->string('street', 255);
            $table->string('barangay', 255);
            $table->string('city', 100);
            $table->string('province', 100);
            $table->string('postal_code', 20);
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gamefarms');
    }
};
