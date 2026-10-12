<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('farm_gamefowl_listings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->foreignId('gamefowl_catalog_id')->constrained('gamefowl_catalog')->cascadeOnDelete();
            $table->decimal('price', 12, 2);
            $table->string('selling_unit', 30);
            $table->unsignedInteger('stock')->default(0);
            $table->string('release_option', 50);
            $table->date('release_date')->nullable();
            $table->unsignedInteger('popularity')->default(0);
            $table->string('status', 50)->default('active');
            $table->timestamps();

            $table->unique(['farm_id', 'gamefowl_catalog_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('farm_gamefowl_listings');
    }
};
