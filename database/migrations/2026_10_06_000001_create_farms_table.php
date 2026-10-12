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
        if (Schema::hasTable('farms')) {
            return;
        }

        Schema::create('farms', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('registered_business_name', 255)->nullable();
            $table->string('owner_name', 255)->nullable();
            $table->text('description')->nullable();
            $table->string('contact_number', 30)->nullable();
            $table->string('email', 255)->nullable();
            $table->text('permits')->nullable();
            $table->string('logo_url', 255)->nullable();
            $table->string('banner_url', 255)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('postal_code', 20)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('cover_url', 255)->nullable();
            $table->string('permit_url', 255)->nullable();
            $table->string('operating_days', 500)->nullable();
            $table->string('operating_hours', 100)->nullable();
            $table->string('status', 50)->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('farms');
    }
};
