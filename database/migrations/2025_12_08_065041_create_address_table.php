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
        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            
            // Address identification
            $table->string('address_label', 50); // e.g., "Home", "Office", "Farm"
            $table->enum('address_type', ['home', 'work', 'farm', 'other'])->nullable()->default('home');
            
            // Contact details for this address
            $table->string('recipient_name', 100); // Person to receive at this address
            $table->string('contact_number', 20);
            
            // Philippine address structure
            $table->string('region', 100)->nullable(); // e.g., "Region IV-A (CALABARZON)"
            $table->string('province', 100)->nullable(); // e.g., "Laguna"
            $table->string('city_municipality', 100); // e.g., "Los Baños"
            $table->string('barangay', 100)->nullable(); // e.g., "Batong Malake"
            $table->string('postal_code', 10)->nullable();
            $table->string('street_address', 255); // House/Unit No., Street, Landmark
            $table->text('full_address')->nullable(); // Complete formatted address
            $table->text('additional_notes')->nullable(); // Delivery instructions
            
            // Geolocation for map/delivery
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            
            // Flags
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for common queries
            $table->index(['user_id', 'is_default']);
            $table->index(['user_id', 'is_active']);
            $table->index('city_municipality');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('addresses');
    }
};
