<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_details', function (Blueprint $table) {
            $table->string('rider_license_number', 100)->nullable();
            $table->string('rider_vehicle_type', 50)->nullable();
            $table->string('rider_vehicle_brand', 100)->nullable();
            $table->string('rider_vehicle_model', 100)->nullable();
            $table->string('rider_license_front_path', 500)->nullable();
            $table->string('rider_license_back_path', 500)->nullable();
            $table->string('rider_vehicle_registration_path', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('user_details', function (Blueprint $table) {
            $table->dropColumn([
                'rider_license_number',
                'rider_vehicle_type',
                'rider_vehicle_brand',
                'rider_vehicle_model',
                'rider_license_front_path',
                'rider_license_back_path',
                'rider_vehicle_registration_path',
            ]);
        });
    }
};
