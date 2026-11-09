<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_partners', function (Blueprint $table) {
            $table->id();
            $table->string('name', 255);
            $table->string('registered_business_name', 255)->nullable();
            $table->string('owner_name', 255)->nullable();
            $table->string('address', 500)->nullable();
            $table->string('city', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('contact_number', 30)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('service_area', 255)->nullable();
            $table->text('permits')->nullable();
            $table->string('status', 50)->default('active');
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('shipping_partner_id')
                ->nullable()
                ->after('farm_id')
                ->constrained('shipping_partners')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('shipping_partner_id');
        });

        Schema::dropIfExists('shipping_partners');
    }
};
